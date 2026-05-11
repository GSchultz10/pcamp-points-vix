/**
 * Camada de dados do PCamp Points.
 *
 * Estratégia: se o Supabase estiver configurado (variáveis de ambiente preenchidas),
 * usa o banco real. Caso contrário, faz fallback transparente para localStorage —
 * útil pra desenvolvimento local antes de configurar o backend.
 *
 * Toda interação com dados PASSA por este arquivo. O componente nunca chama
 * supabase ou localStorage diretamente.
 */

import { supabase, isSupabaseConfigured } from "./supabase.js";

const LS_USER_PREFIX = "pcamp:vix:user:";

// ====== UTILS ======
const phoneToKey = (phoneFormatted) => phoneFormatted.replace(/\D/g, "");

// ====== EVENT CODE VALIDATION ======

/**
 * Verifica se um código de evento é válido (existe e está ativo).
 * @returns {Promise<{valid: boolean, eventId?: string}>}
 */
export async function validateEventCode(code) {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, "");
  if (!normalized) return { valid: false };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("events")
      .select("id, code, active")
      .eq("code", normalized)
      .eq("active", true)
      .maybeSingle();
    if (error) {
      console.error("[validateEventCode]", error);
      return { valid: false };
    }
    return { valid: !!data, eventId: data?.id, code: normalized };
  }

  // Fallback localStorage: consulta eventos criados pelo admin
  const events = JSON.parse(localStorage.getItem(LS_EVENTS_KEY) || "[]");
  const match = events.find((e) => e.code === normalized && e.active);
  return {
    valid: !!match,
    eventId: match?.id,
    code: normalized,
  };
}

// ====== USER (CHECK-IN) ======

/**
 * Busca um usuário pelo telefone e retorna seus dados agregados.
 * @returns {Promise<{found: boolean, user?: object}>}
 */
export async function getUserByPhone(phoneFormatted) {
  const phoneKey = phoneToKey(phoneFormatted);

  if (isSupabaseConfigured) {
    const { data: existingUser, error } = await supabase
      .from("users")
      .select("*")
      .eq("phone_key", phoneKey)
      .maybeSingle();
    if (error) throw error;
    if (!existingUser) return { found: false };
    const user = await getUserAggregateSupabase(existingUser.id);
    return { found: true, user };
  }

  // Fallback localStorage
  const key = `${LS_USER_PREFIX}${phoneKey}`;
  const raw = localStorage.getItem(key);
  if (!raw) return { found: false };
  return { found: true, user: JSON.parse(raw) };
}

/**
 * Faz check-in do usuário em um evento.
 * - Cria usuário se não existir.
 * - Soma 1 ponto.
 * - Marca como "alreadyClaimed: true" se já tiver feito check-in nesse evento.
 *
 * @returns {Promise<{user, alreadyClaimed: boolean}>}
 */
export async function checkInUser({ name, phoneFormatted, eventCode, eventId }) {
  const phoneKey = phoneToKey(phoneFormatted);
  const now = new Date().toISOString();

  if (isSupabaseConfigured) {
    return checkInSupabase({ name, phoneKey, phoneFormatted, eventCode, eventId, now });
  }
  return checkInLocalStorage({ name, phoneKey, phoneFormatted, eventCode, now });
}

// ----- Supabase -----
async function checkInSupabase({ name, phoneKey, phoneFormatted, eventCode, eventId, now }) {
  // 1) Upsert usuário
  const { data: existingUser, error: fetchErr } = await supabase
    .from("users")
    .select("*")
    .eq("phone_key", phoneKey)
    .maybeSingle();
  if (fetchErr) throw fetchErr;

  let userId;
  if (existingUser) {
    userId = existingUser.id;
    // Atualiza nome (caso a pessoa tenha digitado diferente)
    await supabase
      .from("users")
      .update({ name: name.trim(), last_seen: now })
      .eq("id", userId);
  } else {
    const { data: created, error: insertErr } = await supabase
      .from("users")
      .insert({
        phone_key: phoneKey,
        phone_formatted: phoneFormatted,
        name: name.trim(),
        created_at: now,
        last_seen: now,
      })
      .select()
      .single();
    if (insertErr) throw insertErr;
    userId = created.id;
  }

  // 2) Verifica se já tem check-in nesse evento
  const { data: existingCheckin } = await supabase
    .from("checkins")
    .select("id")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (existingCheckin) {
    const user = await getUserAggregateSupabase(userId);
    return { user, alreadyClaimed: true };
  }

  // 3) Cria checkin
  const { error: checkinErr } = await supabase.from("checkins").insert({
    user_id: userId,
    event_id: eventId,
    event_code: eventCode,
    points: 1,
    created_at: now,
  });
  if (checkinErr) throw checkinErr;

  const user = await getUserAggregateSupabase(userId);
  return { user, alreadyClaimed: false };
}

async function getUserAggregateSupabase(userId) {
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  const { data: checkins } = await supabase
    .from("checkins")
    .select("event_code, points, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const totalPoints = (checkins || []).reduce((sum, c) => sum + c.points, 0);

  return {
    name: user.name,
    phoneFormatted: user.phone_formatted,
    phoneKey: user.phone_key,
    points: totalPoints,
    createdAt: user.created_at,
    events: (checkins || []).map((c) => ({
      date: c.created_at,
      code: c.event_code,
      pts: c.points,
    })),
  };
}

// ====== ADMIN FUNCTIONS ======

const ADMIN_PASSWORD_KEY = "pcamp:vix:admin_password";
const LS_EVENTS_KEY = "pcamp:vix:events";
const LS_CHECKINS_KEY = "pcamp:vix:checkins";

/**
 * Verifica senha de admin.
 * Em produção usa VITE_ADMIN_PASSWORD. Em dev, aceita "admin123".
 */
export function verifyAdminPassword(password) {
  const envPassword = import.meta.env.VITE_ADMIN_PASSWORD;
  const expected = envPassword || "admin123@vix";
  return password === expected;
}

/**
 * Lista todos os eventos (ativos e inativos).
 */
export async function listAllEvents() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }

  // Fallback localStorage
  const raw = localStorage.getItem(LS_EVENTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

/**
 * Cria um novo evento.
 */
export async function createEvent({ code, name, eventDate, location, speakers, active }) {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, "");

  if (isSupabaseConfigured) {
    const row = {
      code: normalized,
      name: name.trim(),
      active: active ?? true,
    };
    if (eventDate) row.event_date = eventDate;
    if (location?.trim()) row.location = location.trim();
    if (speakers?.trim()) row.speakers = speakers.trim();

    const { data, error } = await supabase
      .from("events")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Fallback localStorage
  const events = JSON.parse(localStorage.getItem(LS_EVENTS_KEY) || "[]");
  const existing = events.find((e) => e.code === normalized);
  if (existing) throw new Error("Código já existe");
  const newEvent = {
    id: crypto.randomUUID(),
    code: normalized,
    name: name.trim(),
    event_date: eventDate || null,
    location: location?.trim() || null,
    speakers: speakers?.trim() || null,
    active: active ?? true,
    created_at: new Date().toISOString(),
  };
  events.unshift(newEvent);
  localStorage.setItem(LS_EVENTS_KEY, JSON.stringify(events));
  return newEvent;
}

/**
 * Atualiza um evento existente.
 */
export async function updateEvent(id, fields) {
  if (isSupabaseConfigured) {
    const clean = {};
    for (const [k, v] of Object.entries(fields)) {
      clean[k] = v === "" ? null : v;
    }
    const { data, error } = await supabase
      .from("events")
      .update(clean)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Fallback localStorage
  const events = JSON.parse(localStorage.getItem(LS_EVENTS_KEY) || "[]");
  const idx = events.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error("Evento não encontrado");
  events[idx] = { ...events[idx], ...fields };
  localStorage.setItem(LS_EVENTS_KEY, JSON.stringify(events));
  return events[idx];
}

/**
 * Busca participantes (check-ins) de um evento específico.
 */
export async function getEventAttendees(eventId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("checkins")
      .select("id, points, created_at, event_code, users(name, phone_formatted)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((c) => ({
      name: c.users?.name,
      phone: c.users?.phone_formatted,
      points: c.points,
      checkedInAt: c.created_at,
    }));
  }

  // Fallback localStorage: scan all user keys for matching event
  const attendees = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key.startsWith(LS_USER_PREFIX)) continue;
    const user = JSON.parse(localStorage.getItem(key));
    const events = JSON.parse(localStorage.getItem(LS_EVENTS_KEY) || "[]");
    const event = events.find((e) => e.id === eventId);
    if (!event) continue;
    const match = (user.events || []).find((e) => e.code === event.code);
    if (match) {
      attendees.push({
        name: user.name,
        phone: user.phoneFormatted,
        points: match.pts,
        checkedInAt: match.date,
      });
    }
  }
  return attendees;
}

/**
 * Exclui um evento pelo ID.
 */
export async function deleteEvent(id) {
  if (isSupabaseConfigured) {
    // checkins são removidos automaticamente via ON DELETE CASCADE
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) throw error;
    return;
  }

  // Fallback localStorage: remove o evento e os check-ins associados dos usuários
  const events = JSON.parse(localStorage.getItem(LS_EVENTS_KEY) || "[]");
  const event = events.find((e) => e.id === id);
  if (!event) return;

  // Remove check-ins desse evento de todos os usuários
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key.startsWith(LS_USER_PREFIX)) continue;
    const user = JSON.parse(localStorage.getItem(key));
    const before = (user.events || []).length;
    user.events = (user.events || []).filter((e) => e.code !== event.code);
    if (user.events.length < before) {
      user.points = user.events.reduce((sum, e) => sum + e.pts, 0);
      localStorage.setItem(key, JSON.stringify(user));
    }
  }

  const filtered = events.filter((e) => e.id !== id);
  localStorage.setItem(LS_EVENTS_KEY, JSON.stringify(filtered));
}

/**
 * Retorna o ranking geral de participantes (todos os usuários com pontos).
 */
export async function getRanking() {
  if (isSupabaseConfigured) {
    const { data: users, error: uErr } = await supabase
      .from("users")
      .select("id, name, phone_key, phone_formatted, created_at");
    if (uErr) throw uErr;

    const { data: checkins, error: cErr } = await supabase
      .from("checkins")
      .select("user_id, points");
    if (cErr) throw cErr;

    const pointsMap = {};
    const eventsMap = {};
    for (const c of checkins || []) {
      pointsMap[c.user_id] = (pointsMap[c.user_id] || 0) + c.points;
      eventsMap[c.user_id] = (eventsMap[c.user_id] || 0) + 1;
    }

    return (users || [])
      .map((u) => ({
        id: u.id,
        name: u.name,
        phoneKey: u.phone_key,
        phone: u.phone_formatted,
        points: pointsMap[u.id] || 0,
        totalEvents: eventsMap[u.id] || 0,
        createdAt: u.created_at,
      }))
      .filter((u) => u.points > 0)
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  }

  // Fallback localStorage
  const ranking = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key.startsWith(LS_USER_PREFIX)) continue;
    const user = JSON.parse(localStorage.getItem(key));
    if ((user.points || 0) > 0) {
      ranking.push({
        id: user.phoneKey,
        name: user.name,
        phoneKey: user.phoneKey,
        phone: user.phoneFormatted,
        points: user.points || 0,
        totalEvents: (user.events || []).length,
        createdAt: user.createdAt,
      });
    }
  }
  return ranking.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

/**
 * Zera todos os pontos de um participante (remove todos os check-ins).
 */
export async function resetUserPoints(userId) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from("checkins").delete().eq("user_id", userId);
    if (error) throw error;
    return;
  }

  // Fallback localStorage: userId é o phoneKey
  const key = `${LS_USER_PREFIX}${userId}`;
  const raw = localStorage.getItem(key);
  if (!raw) return;
  const user = JSON.parse(raw);
  user.points = 0;
  user.events = [];
  localStorage.setItem(key, JSON.stringify(user));
}

// ----- localStorage (fallback) -----
function checkInLocalStorage({ name, phoneKey, phoneFormatted, eventCode, now }) {
  const key = `${LS_USER_PREFIX}${phoneKey}`;
  const raw = localStorage.getItem(key);
  const existing = raw ? JSON.parse(raw) : null;

  const alreadyClaimed = !!existing?.events?.some((e) => e.code === eventCode);

  let user;
  if (existing && alreadyClaimed) {
    user = existing;
  } else if (existing) {
    user = {
      ...existing,
      name: name.trim(),
      points: existing.points + 1,
      events: [
        ...(existing.events || []),
        { date: now, code: eventCode, pts: 1 },
      ],
      lastSeen: now,
    };
  } else {
    user = {
      phoneKey,
      phoneFormatted,
      name: name.trim(),
      points: 1,
      events: [{ date: now, code: eventCode, pts: 1 }],
      createdAt: now,
      lastSeen: now,
    };
  }

  localStorage.setItem(key, JSON.stringify(user));
  return Promise.resolve({ user, alreadyClaimed });
}
