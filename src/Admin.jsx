import React, { useState, useEffect } from "react";
import logoFull from "./assets/logo-full.png";
import {
  verifyAdminPassword,
  listAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventAttendees,
  getRanking,
  resetUserPoints,
} from "./lib/dataRepository.js";

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [screen, setScreen] = useState("list"); // list | create | detail | edit | ranking | participant
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedParticipant, setSelectedParticipant] = useState(null);

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="pcamp-root" style={{ minHeight: "100vh" }}>
      <AdminHeader
        currentScreen={screen}
        onNavigate={(s) => {
          setScreen(s);
          setSelectedEvent(null);
          setSelectedParticipant(null);
        }}
        onLogout={() => {
          setAuthed(false);
          setScreen("list");
          setSelectedEvent(null);
          setSelectedParticipant(null);
        }}
      />
      <div className="max-w-[900px] mx-auto px-6 py-10">
        {screen === "list" && (
          <EventList
            onCreateNew={() => setScreen("create")}
            onSelectEvent={(ev) => {
              setSelectedEvent(ev);
              setScreen("detail");
            }}
          />
        )}
        {screen === "create" && (
          <CreateEventForm
            onBack={() => setScreen("list")}
            onCreated={() => setScreen("list")}
          />
        )}
        {screen === "detail" && selectedEvent && (
          <EventDetail
            event={selectedEvent}
            onBack={() => {
              setSelectedEvent(null);
              setScreen("list");
            }}
            onEdit={() => setScreen("edit")}
            onDeleted={() => {
              setSelectedEvent(null);
              setScreen("list");
            }}
          />
        )}
        {screen === "edit" && selectedEvent && (
          <EditEventForm
            event={selectedEvent}
            onBack={() => setScreen("detail")}
            onSaved={(updated) => {
              setSelectedEvent(updated);
              setScreen("detail");
            }}
          />
        )}
        {screen === "ranking" && (
          <RankingList
            onSelectParticipant={(p) => {
              setSelectedParticipant(p);
              setScreen("participant");
            }}
          />
        )}
        {screen === "participant" && selectedParticipant && (
          <ParticipantDetail
            participant={selectedParticipant}
            onBack={() => {
              setSelectedParticipant(null);
              setScreen("ranking");
            }}
          />
        )}
      </div>
    </div>
  );
}

// =============== HEADER ===============
function AdminHeader({ currentScreen, onNavigate, onLogout }) {
  return (
    <header className="relative z-[2] border-b border-white/10 backdrop-blur-md">
      <div className="max-w-[900px] mx-auto px-6 py-[18px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoFull} alt="ProductCamp Pocket" className="h-[26px] w-auto block" />
          <span className="text-xs font-bold tracking-[0.08em] uppercase text-pcamp-pink bg-pcamp-pink/10 border border-pcamp-pink/30 rounded-full px-2.5 py-1">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate("list")}
            className={`text-xs font-semibold cursor-pointer bg-transparent border-0 font-sans transition-colors ${
              currentScreen === "list" || currentScreen === "create" || currentScreen === "detail" || currentScreen === "edit"
                ? "text-white"
                : "text-white/50 hover:text-white"
            }`}
          >
            Eventos
          </button>
          <button
            onClick={() => onNavigate("ranking")}
            className={`text-xs font-semibold cursor-pointer bg-transparent border-0 font-sans transition-colors ${
              currentScreen === "ranking" || currentScreen === "participant"
                ? "text-white"
                : "text-white/50 hover:text-white"
            }`}
          >
            Ranking
          </button>
          <div className="w-px h-4 bg-white/15" />
          <button
            onClick={onLogout}
            className="text-xs text-white/50 hover:text-white transition-colors cursor-pointer bg-transparent border-0 font-sans"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}

// =============== LOGIN ===============
function AdminLogin({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (verifyAdminPassword(password)) {
      onSuccess();
    } else {
      setError("Senha incorreta");
    }
  };

  return (
    <div className="pcamp-root" style={{ minHeight: "100vh" }}>
      <div className="flex items-center justify-center min-h-screen px-6">
        <div
          className="bg-[var(--bg-card)] backdrop-blur-md border border-white/20 rounded-3xl p-12 w-full max-w-[420px]"
          style={{ animation: "fadeUp 0.4s ease-out" }}
        >
          <img src={logoFull} alt="ProductCamp Pocket" className="h-7 w-auto mx-auto mb-8 block" />
          <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-center mb-2">
            Painel Admin
          </h1>
          <p className="text-sm text-white/60 text-center mb-8">
            Acesso restrito para organizadores do PCamp Pocket.
          </p>

          <form onSubmit={handleSubmit} className="grid gap-5">
            <div className="grid gap-2">
              <label className="text-[13px] font-semibold text-white">Senha</label>
              <input
                type="password"
                placeholder="Digite a senha de admin"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className={[
                  "w-full px-[18px] py-4 bg-white/[0.05] border-[1.5px] rounded-[10px] text-white text-base font-sans transition-all",
                  "placeholder:text-white/40 focus:outline-none focus:border-pcamp-pink focus:bg-white/[0.08]",
                  error ? "border-[var(--warn)]" : "border-white/20",
                ].join(" ")}
              />
              {error && <div className="text-[13px] text-[var(--warn)] mt-0.5">{error}</div>}
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-7 py-4 rounded-[10px] border-0 font-bold text-[15px] cursor-pointer transition-all font-sans bg-pcamp-pink text-white shadow-[0_8px_24px_var(--accent-glow)] hover:bg-pcamp-pink-soft hover:-translate-y-px"
            >
              Entrar
            </button>
          </form>

          <a
            href="#/"
            className="block text-center text-xs text-white/45 mt-6 hover:text-white/70 transition-colors"
          >
            Voltar para o site
          </a>
        </div>
      </div>
    </div>
  );
}

// =============== EVENT LIST ===============
function EventList({ onCreateNew, onSelectEvent }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAllEvents()
      .then(setEvents)
      .catch((err) => console.error("[EventList]", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ animation: "fadeUp 0.4s ease-out" }}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-extrabold tracking-[-0.02em]">Eventos</h1>
        <button
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-[10px] border-0 font-bold text-sm cursor-pointer transition-all font-sans bg-pcamp-pink text-white hover:bg-pcamp-pink-soft"
        >
          + Novo evento
        </button>
      </div>

      {loading ? (
        <p className="text-white/60 text-sm">Carregando...</p>
      ) : events.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-8 text-center">
          <p className="text-white/60 text-sm mb-4">Nenhum evento cadastrado ainda.</p>
          <button
            onClick={onCreateNew}
            className="text-pcamp-pink text-sm font-bold hover:text-pcamp-pink-soft cursor-pointer bg-transparent border-0 font-sans"
          >
            Criar primeiro evento
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {events.map((ev) => (
            <button
              key={ev.id}
              onClick={() => onSelectEvent(ev)}
              className="w-full text-left flex justify-between items-center py-4 px-5 bg-white/[0.03] border border-white/10 rounded-xl hover:border-pcamp-pink/40 hover:bg-white/[0.05] transition-all cursor-pointer font-sans"
            >
              <div>
                <div className="font-bold text-sm mb-0.5 text-white">{ev.name}</div>
                <div className="flex items-center gap-3 text-xs text-white/45">
                  <span className="font-mono tracking-wider text-pcamp-pink">{ev.code}</span>
                  {ev.event_date && (
                    <span>
                      {new Date(ev.event_date + "T12:00:00").toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                  {ev.location && <span>{ev.location}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={[
                    "text-[10px] font-bold tracking-[0.08em] uppercase px-2 py-1 rounded-full border",
                    ev.active
                      ? "text-[var(--success)] bg-[rgba(105,240,174,0.1)] border-[rgba(105,240,174,0.3)]"
                      : "text-white/45 bg-white/[0.05] border-white/10",
                  ].join(" ")}
                >
                  {ev.active ? "Ativo" : "Inativo"}
                </span>
                <span className="text-white/30 text-lg">&rsaquo;</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =============== CREATE EVENT ===============
function CreateEventForm({ onBack, onCreated }) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    eventDate: "",
    location: "",
    speakers: "",
    active: true,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => {
    const val = field === "active" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) return setError("Código é obrigatório");
    if (!form.name.trim()) return setError("Nome do evento é obrigatório");

    setSubmitting(true);
    try {
      await createEvent(form);
      onCreated();
    } catch (err) {
      setError(err.message || "Erro ao criar evento");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ animation: "fadeUp 0.4s ease-out" }}>
      <BackButton onClick={onBack} />
      <h1 className="text-2xl font-extrabold tracking-[-0.02em] mb-8">Novo evento</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-[var(--bg-card)] backdrop-blur-md border border-white/20 rounded-2xl p-8 grid gap-5"
      >
        <EventFormFields form={form} set={set} setForm={setForm} />

        {error && <ErrorBanner>{error}</ErrorBanner>}

        <SubmitButton disabled={submitting}>
          {submitting ? "Criando..." : "Criar evento"}
        </SubmitButton>
      </form>
      <AdminInputStyles />
    </div>
  );
}

// =============== EDIT EVENT ===============
function EditEventForm({ event, onBack, onSaved }) {
  const [form, setForm] = useState({
    code: event.code,
    name: event.name,
    eventDate: event.event_date || "",
    location: event.location || "",
    speakers: event.speakers || "",
    active: event.active,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => {
    const val = field === "active" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Nome do evento é obrigatório");

    setSubmitting(true);
    try {
      const updated = await updateEvent(event.id, {
        name: form.name.trim(),
        event_date: form.eventDate || null,
        location: form.location?.trim() || null,
        speakers: form.speakers?.trim() || null,
        active: form.active,
      });
      onSaved(updated);
    } catch (err) {
      setError(err.message || "Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ animation: "fadeUp 0.4s ease-out" }}>
      <BackButton onClick={onBack} />
      <h1 className="text-2xl font-extrabold tracking-[-0.02em] mb-8">Editar evento</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-[var(--bg-card)] backdrop-blur-md border border-white/20 rounded-2xl p-8 grid gap-5"
      >
        <Field label="Código do evento">
          <input
            type="text"
            value={form.code}
            disabled
            className="admin-input opacity-50 cursor-not-allowed"
          />
          <p className="text-[11px] text-white/35 mt-1">O código não pode ser alterado.</p>
        </Field>

        <Field label="Nome do evento" required>
          <input
            type="text"
            value={form.name}
            onChange={set("name")}
            className="admin-input"
          />
        </Field>

        <Field label="Data do evento">
          <input
            type="date"
            value={form.eventDate}
            onChange={set("eventDate")}
            className="admin-input"
          />
        </Field>

        <Field label="Local">
          <input
            type="text"
            placeholder="Arca, Vitória/ES"
            value={form.location}
            onChange={set("location")}
            className="admin-input"
          />
        </Field>

        <Field label="Palestrantes">
          <textarea
            placeholder="Um por linha"
            value={form.speakers}
            onChange={set("speakers")}
            rows={3}
            className="admin-input resize-y"
          />
        </Field>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.active}
            onChange={set("active")}
            className="w-4 h-4 accent-pcamp-pink"
          />
          <span className="text-sm text-white font-medium">Evento ativo (aceitando check-ins)</span>
        </label>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        <SubmitButton disabled={submitting}>
          {submitting ? "Salvando..." : "Salvar alterações"}
        </SubmitButton>
      </form>
      <AdminInputStyles />
    </div>
  );
}

// =============== EVENT DETAIL ===============
function EventDetail({ event: initialEvent, onBack, onEdit, onDeleted }) {
  const [event, setEvent] = useState(initialEvent);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getEventAttendees(event.id)
      .then(setAttendees)
      .catch((err) => console.error("[EventDetail]", err))
      .finally(() => setLoading(false));
  }, [event.id]);

  const handleToggleActive = async () => {
    setToggling(true);
    try {
      const updated = await updateEvent(event.id, { active: !event.active });
      setEvent(updated);
    } catch (err) {
      console.error("[toggleActive]", err);
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteEvent(event.id);
      onDeleted();
    } catch (err) {
      console.error("[deleteEvent]", err);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div style={{ animation: "fadeUp 0.4s ease-out" }}>
      <BackButton onClick={onBack} />

      {/* Event Info */}
      <div className="bg-[var(--bg-card)] backdrop-blur-md border border-white/20 rounded-2xl p-8 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-[-0.02em] mb-1">{event.name}</h1>
            <span className="font-mono text-sm tracking-wider text-pcamp-pink">{event.code}</span>
          </div>
          <button
            onClick={handleToggleActive}
            disabled={toggling}
            className={[
              "text-xs font-bold tracking-[0.06em] uppercase px-3 py-1.5 rounded-full border cursor-pointer transition-all font-sans",
              event.active
                ? "text-[var(--success)] bg-[rgba(105,240,174,0.1)] border-[rgba(105,240,174,0.3)] hover:bg-[rgba(105,240,174,0.2)]"
                : "text-white/45 bg-white/[0.05] border-white/10 hover:border-white/30",
            ].join(" ")}
          >
            {toggling ? "..." : event.active ? "Ativo" : "Inativo"}
          </button>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 mb-6">
          {event.event_date && (
            <InfoBlock label="Data">
              {new Date(event.event_date + "T12:00:00").toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </InfoBlock>
          )}
          {event.location && <InfoBlock label="Local">{event.location}</InfoBlock>}
          {event.speakers && (
            <InfoBlock label="Palestrantes">
              {event.speakers.split("\n").map((s, i) => (
                <span key={i}>
                  {s.trim()}
                  {i < event.speakers.split("\n").length - 1 && <br />}
                </span>
              ))}
            </InfoBlock>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/20 text-sm font-semibold text-white hover:border-pcamp-pink hover:text-pcamp-pink cursor-pointer bg-transparent font-sans transition-all"
          >
            Editar evento
          </button>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-sm font-semibold text-white/45 hover:border-[var(--warn)] hover:text-[var(--warn)] cursor-pointer bg-transparent font-sans transition-all"
            >
              Excluir
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--warn)]">Tem certeza?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-2 rounded-lg bg-[var(--warn)] text-white text-xs font-bold cursor-pointer border-0 font-sans disabled:opacity-50"
              >
                {deleting ? "Excluindo..." : "Sim, excluir"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-2 rounded-lg border border-white/20 text-white/60 text-xs font-bold cursor-pointer bg-transparent font-sans"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Attendees */}
      <div className="bg-[var(--bg-card)] backdrop-blur-md border border-white/20 rounded-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold tracking-[-0.01em]">Participantes</h2>
          <span className="text-sm text-white/45 font-medium">
            {loading ? "..." : `${attendees.length} check-in${attendees.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {loading ? (
          <p className="text-white/60 text-sm">Carregando...</p>
        ) : attendees.length === 0 ? (
          <p className="text-white/45 text-sm text-center py-6">
            Nenhum participante resgatou este código ainda.
          </p>
        ) : (
          <div className="grid gap-2">
            {attendees.map((a, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-3.5 px-4 bg-white/[0.03] border border-white/10 rounded-[10px]"
              >
                <div>
                  <div className="font-semibold text-sm mb-0.5">{a.name}</div>
                  <div className="text-xs text-white/45">{a.phone}</div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-pcamp-pink text-sm">+{a.points} pt</div>
                  <div className="text-[11px] text-white/35">
                    {new Date(a.checkedInAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =============== RANKING ===============
function RankingList({ onSelectParticipant }) {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRanking()
      .then(setRanking)
      .catch((err) => console.error("[RankingList]", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ animation: "fadeUp 0.4s ease-out" }}>
      <h1 className="text-2xl font-extrabold tracking-[-0.02em] mb-2">Ranking</h1>
      <p className="text-sm text-white/50 mb-8">
        Todos os participantes ordenados por pontos. Clique para ver detalhes.
      </p>

      {loading ? (
        <p className="text-white/60 text-sm">Carregando...</p>
      ) : ranking.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-8 text-center">
          <p className="text-white/45 text-sm">Nenhum participante com pontos ainda.</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {ranking.map((p, i) => (
            <button
              key={p.id}
              onClick={() => onSelectParticipant(p)}
              className="w-full text-left flex items-center gap-4 py-4 px-5 bg-white/[0.03] border border-white/10 rounded-xl hover:border-pcamp-pink/40 hover:bg-white/[0.05] transition-all cursor-pointer font-sans"
            >
              <div
                className={[
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-extrabold",
                  i === 0
                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                    : i === 1
                      ? "bg-gray-300/10 text-gray-300 border border-gray-400/30"
                      : i === 2
                        ? "bg-amber-700/15 text-amber-600 border border-amber-700/30"
                        : "bg-white/[0.05] text-white/40 border border-white/10",
                ].join(" ")}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm mb-0.5 text-white truncate">{p.name}</div>
                <div className="text-xs text-white/45">
                  {p.phone} &middot; {p.totalEvents} evento{p.totalEvents !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-lg font-extrabold text-pcamp-pink">{p.points}</span>
                  <span className="text-xs text-white/45 ml-1">{p.points === 1 ? "pt" : "pts"}</span>
                </div>
                <span className="text-white/30 text-lg">&rsaquo;</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =============== PARTICIPANT DETAIL ===============
function ParticipantDetail({ participant, onBack }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [wasReset, setWasReset] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetUserPoints(participant.id);
      setWasReset(true);
      setConfirmReset(false);
    } catch (err) {
      console.error("[resetUserPoints]", err);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={{ animation: "fadeUp 0.4s ease-out" }}>
      <BackButton onClick={onBack} />

      <div className="bg-[var(--bg-card)] backdrop-blur-md border border-white/20 rounded-2xl p-8">
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] mb-1">{participant.name}</h1>
        <p className="text-sm text-white/45 mb-6">{participant.phone}</p>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3 mb-6">
          <InfoBlock label="Pontos">
            <span className={`text-xl font-extrabold ${wasReset ? "text-white/30 line-through" : "text-pcamp-pink"}`}>
              {wasReset ? participant.points : participant.points}
            </span>
            {wasReset && (
              <span className="text-xl font-extrabold text-[var(--success)] ml-2">0</span>
            )}
          </InfoBlock>
          <InfoBlock label="Eventos">{participant.totalEvents}</InfoBlock>
          <InfoBlock label="Desde">
            {new Date(participant.createdAt).toLocaleDateString("pt-BR", {
              month: "short",
              year: "numeric",
            })}
          </InfoBlock>
        </div>

        <div className="pt-4 border-t border-white/10">
          {wasReset ? (
            <div className="flex items-center gap-2 text-[var(--success)] text-sm font-semibold">
              <span>Pontos zerados com sucesso.</span>
            </div>
          ) : !confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--warn)]/30 text-sm font-semibold text-[var(--warn)] hover:bg-[rgba(255,138,128,0.08)] cursor-pointer bg-transparent font-sans transition-all"
            >
              Zerar pontos deste participante
            </button>
          ) : (
            <div className="bg-[rgba(255,138,128,0.06)] border border-[rgba(255,138,128,0.2)] rounded-xl p-4">
              <p className="text-sm text-[var(--warn)] font-semibold mb-1">
                Tem certeza que deseja zerar todos os pontos?
              </p>
              <p className="text-xs text-white/45 mb-4">
                Essa ação vai remover todos os check-ins de {participant.name}. Não pode ser desfeita.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="px-4 py-2.5 rounded-lg bg-[var(--warn)] text-white text-sm font-bold cursor-pointer border-0 font-sans disabled:opacity-50"
                >
                  {resetting ? "Zerando..." : "Sim, zerar pontos"}
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-4 py-2.5 rounded-lg border border-white/20 text-white/60 text-sm font-semibold cursor-pointer bg-transparent font-sans"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============== SHARED FORM FIELDS ===============
function EventFormFields({ form, set, setForm }) {
  return (
    <>
      <Field label="Código do evento" required>
        <input
          type="text"
          placeholder="POCKET-03"
          value={form.code}
          onChange={(e) => {
            setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }));
          }}
          maxLength={20}
          className="admin-input"
        />
      </Field>

      <Field label="Nome do evento" required>
        <input
          type="text"
          placeholder="PCamp Pocket Vix #3"
          value={form.name}
          onChange={set("name")}
          className="admin-input"
        />
      </Field>

      <Field label="Data do evento">
        <input
          type="date"
          value={form.eventDate}
          onChange={set("eventDate")}
          className="admin-input"
        />
      </Field>

      <Field label="Local">
        <input
          type="text"
          placeholder="Arca, Vitória/ES"
          value={form.location}
          onChange={set("location")}
          className="admin-input"
        />
      </Field>

      <Field label="Palestrantes">
        <textarea
          placeholder="Um por linha"
          value={form.speakers}
          onChange={set("speakers")}
          rows={3}
          className="admin-input resize-y"
        />
      </Field>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.active}
          onChange={set("active")}
          className="w-4 h-4 accent-pcamp-pink"
        />
        <span className="text-sm text-white font-medium">Evento ativo (aceitando check-ins)</span>
      </label>
    </>
  );
}

// =============== PRIMITIVES ===============
function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-sm text-white/60 hover:text-white mb-6 cursor-pointer bg-transparent border-0 font-sans transition-colors"
    >
      &larr; Voltar
    </button>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="grid gap-2">
      <label className="text-[13px] font-semibold text-white">
        {label}
        {required && <span className="text-pcamp-pink ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function InfoBlock({ label, children }) {
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
      <div className="text-[11px] font-bold tracking-[0.08em] uppercase text-white/45 mb-1.5">
        {label}
      </div>
      <div className="text-sm font-medium leading-relaxed">{children}</div>
    </div>
  );
}

function ErrorBanner({ children }) {
  return (
    <div className="text-[13px] text-[var(--warn)] bg-[rgba(255,138,128,0.08)] border border-[rgba(255,138,128,0.2)] rounded-lg px-4 py-3">
      {children}
    </div>
  );
}

function SubmitButton({ disabled, children }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full inline-flex items-center justify-center gap-2 px-7 py-4 rounded-[10px] border-0 font-bold text-[15px] cursor-pointer transition-all font-sans bg-pcamp-pink text-white shadow-[0_8px_24px_var(--accent-glow)] hover:bg-pcamp-pink-soft disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function AdminInputStyles() {
  return (
    <style>{`
      .admin-input {
        width: 100%;
        padding: 14px 18px;
        background: rgba(255,255,255,0.05);
        border: 1.5px solid rgba(255,255,255,0.2);
        border-radius: 10px;
        color: #fff;
        font-size: 15px;
        font-family: 'Inter', system-ui, sans-serif;
        transition: all 0.2s;
      }
      .admin-input::placeholder { color: rgba(255,255,255,0.4); }
      .admin-input:focus {
        outline: none;
        border-color: #DF0C78;
        background: rgba(255,255,255,0.08);
        box-shadow: 0 0 0 4px rgba(223, 12, 120, 0.18);
      }
    `}</style>
  );
}
