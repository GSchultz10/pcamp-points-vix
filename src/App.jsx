import React, { useState } from "react";
import logoFull from "./assets/logo-full.png";
import logoSymbol from "./assets/logo-symbol.png";
import Stepper from "./components/Stepper.jsx";
import { formatPhone, isValidPhone } from "./lib/validation.js";
import { validateEventCode, checkInUser, getUserByPhone, getRanking } from "./lib/dataRepository.js";

// =============== ÍCONES (SVG inline) ===============
const Icon = ({ name, ...props }) => {
  const icons = {
    check: (
      <path
        d="M5 13l4 4L19 7"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        fill="none"
        stroke="currentColor"
      />
    ),
    arrow: (
      <path
        d="M5 12h14M13 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  };
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      {icons[name]}
    </svg>
  );
};

// =============== APP ===============
export default function App() {
  // step: welcome | login | code | success | lookup
  const [step, setStep] = useState("welcome");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [eventCode, setEventCode] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [validatedEvent, setValidatedEvent] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [lookupPhone, setLookupPhone] = useState("");

  // ===== Step transitions =====

  // Step 2: valida código e avança pra login
  const handleValidateCode = async () => {
    setErrors({});
    setSubmitting(true);
    try {
      const validation = await validateEventCode(eventCode);
      if (!validation.valid) {
        setErrors({
          code: "Código inválido. Confira com a organização do evento.",
        });
        setSubmitting(false);
        return;
      }
      setValidatedEvent({ code: validation.code, eventId: validation.eventId });
      setStep("login");
    } catch (err) {
      console.error("[handleValidateCode]", err);
      setErrors({
        code: "Erro ao validar o código. Tente novamente em instantes.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Step 3: valida nome/telefone e faz check-in
  const handleLogin = async () => {
    const errs = {};
    if (name.trim().length < 2) errs.name = "Digite seu nome";
    if (!isValidPhone(phone))
      errs.phone = "Celular inválido. Use (DDD) 9XXXX-XXXX";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const { user: u, alreadyClaimed: claimed } = await checkInUser({
        name,
        phoneFormatted: phone,
        eventCode: validatedEvent.code,
        eventId: validatedEvent.eventId,
      });
      setUser(u);
      setAlreadyClaimed(claimed);
      setStep("success");
    } catch (err) {
      console.error("[handleLogin]", err);
      setErrors({
        phone: "Erro ao registrar seu ponto. Tente novamente em instantes.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Volta pro step de código mantendo nome/telefone
  const handleAddAnotherCode = () => {
    setEventCode("");
    setValidatedEvent(null);
    setAlreadyClaimed(false);
    setErrors({});
    setStep("code");
  };

  // Fluxo "Ver meus pontos": busca usuário pelo telefone
  const handleLookup = async () => {
    if (!isValidPhone(lookupPhone)) {
      setErrors({ lookup: "Celular inválido. Use (DDD) 9XXXX-XXXX" });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { found, user: u } = await getUserByPhone(lookupPhone);
      if (!found) {
        setErrors({ lookup: "Nenhum registro encontrado para esse número." });
        return;
      }
      setUser(u);
      setViewOnly(true);
      setStep("success");
    } catch (err) {
      console.error("[handleLookup]", err);
      setErrors({ lookup: "Erro ao buscar seus pontos. Tente novamente." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep("welcome");
    setName("");
    setPhone("");
    setEventCode("");
    setValidatedEvent(null);
    setUser(null);
    setErrors({});
    setAlreadyClaimed(false);
    setViewOnly(false);
    setLookupPhone("");
  };

  return (
    <div className="pcamp-root">
      <PageBackground />

      {/* HEADER */}
      <header className="relative z-[2] border-b border-white/10 backdrop-blur-md">
        <div className="max-w-[1100px] mx-auto px-6 py-[18px] flex items-center justify-between">
          <img src={logoFull} alt="ProductCamp Pocket" className="h-[26px] w-auto block" />
          <div className="flex items-center gap-4">
            <div className="text-xs text-white/70 font-medium">Vitória/ES · 2026</div>
            <a
              href="#/admin"
              className="text-[11px] font-bold tracking-[0.06em] uppercase text-white/50 hover:text-pcamp-pink border border-white/15 hover:border-pcamp-pink/40 rounded-full px-3 py-1.5 transition-all no-underline"
            >
              Admin
            </a>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <div className="relative z-[1] max-w-[720px] mx-auto px-4 py-6 sm:px-6 sm:py-12">
        {step !== "lookup" && !(step === "success" && viewOnly) && (
          <Stepper currentStep={step} />
        )}

        {step === "welcome" && (
          <WelcomeStep
            onStart={() => setStep("code")}
            onViewPoints={() => setStep("lookup")}
          />
        )}

        {step === "lookup" && (
          <LookupStep
            phone={lookupPhone}
            errors={errors}
            submitting={submitting}
            onPhoneChange={(v) => {
              setLookupPhone(formatPhone(v));
              if (errors.lookup) setErrors((s) => ({ ...s, lookup: null }));
            }}
            onBack={() => {
              setLookupPhone("");
              setErrors({});
              setStep("welcome");
            }}
            onSubmit={handleLookup}
          />
        )}

        {step === "code" && (
          <CodeStep
            eventCode={eventCode}
            errors={errors}
            submitting={submitting}
            onCodeChange={(v) => {
              setEventCode(v.toUpperCase());
              if (errors.code) setErrors((s) => ({ ...s, code: null }));
            }}
            onBack={() => setStep("welcome")}
            onSubmit={handleValidateCode}
          />
        )}

        {step === "login" && (
          <LoginStep
            name={name}
            phone={phone}
            errors={errors}
            submitting={submitting}
            onNameChange={(v) => {
              setName(v);
              if (errors.name) setErrors((s) => ({ ...s, name: null }));
            }}
            onPhoneChange={(v) => {
              setPhone(formatPhone(v));
              if (errors.phone) setErrors((s) => ({ ...s, phone: null }));
            }}
            onBack={() => setStep("code")}
            onContinue={handleLogin}
          />
        )}

        {step === "success" && user && (
          <SuccessStep
            user={user}
            alreadyClaimed={alreadyClaimed}
            viewOnly={viewOnly}
            onReset={handleReset}
            onAddCode={handleAddAnotherCode}
          />
        )}
      </div>

      {/* RANKING PÚBLICO */}
      <PublicRanking />

      {/* COMUNIDADE & EM BREVE */}
      <SoonSection />

      {/* FOOTER */}
      <footer className="relative z-[1] border-t border-white/10 px-6 py-8 text-center text-white/45 text-xs">
        <img src={logoFull} alt="ProductCamp Pocket" className="h-6 w-auto opacity-65 mx-auto mb-3 block" />
        <div className="leading-relaxed">
          Vitória/ES · Uma iniciativa da comunidade{" "}
          <a
            href="https://www.productcamp.com.br/pocket"
            target="_blank"
            rel="noreferrer"
            className="text-white/70 border-b border-white/10 hover:border-white/30"
          >
            PCamp Pocket
          </a>
        </div>
      </footer>
    </div>
  );
}

// =============== BACKGROUND DECORATIVO ===============
function PageBackground() {
  return (
    <>
      <style>{`
        .pcamp-root {
          background:
            radial-gradient(ellipse 80% 60% at 50% 0%, rgba(223, 12, 120, 0.2), transparent 70%),
            radial-gradient(ellipse 60% 50% at 100% 100%, rgba(223, 12, 120, 0.08), transparent 60%),
            linear-gradient(180deg, var(--bg-mid) 0%, var(--bg-deep) 100%);
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
        }
        .pcamp-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(1px 1px at 25% 30%, white, transparent),
            radial-gradient(1px 1px at 70% 60%, white, transparent),
            radial-gradient(1px 1px at 15% 80%, white, transparent),
            radial-gradient(1px 1px at 85% 20%, white, transparent),
            radial-gradient(1px 1px at 50% 50%, white, transparent),
            radial-gradient(1px 1px at 35% 70%, white, transparent),
            radial-gradient(1px 1px at 90% 85%, white, transparent),
            radial-gradient(1px 1px at 10% 15%, white, transparent);
          opacity: 0.3;
          pointer-events: none;
          z-index: 0;
        }
      `}</style>
    </>
  );
}

// =============== STEPS ===============

function StepCard({ children }) {
  return (
    <div
      className="bg-[var(--bg-card)] backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-12 sm:rounded-3xl overflow-visible"
      style={{ animation: "fadeUp 0.4s ease-out" }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children, variant = "pink" }) {
  const styles =
    variant === "pink"
      ? "text-pcamp-pink bg-pcamp-pink/10 border-pcamp-pink/30"
      : "text-[var(--cyan)] bg-[rgba(79,195,247,0.12)] border-[rgba(79,195,247,0.3)]";
  return (
    <span
      className={`inline-block text-[11px] font-bold tracking-[0.12em] uppercase border rounded-full px-2.5 py-1 mb-5 ${styles}`}
    >
      {children}
    </span>
  );
}

function WelcomeStep({ onStart, onViewPoints }) {
  return (
    <StepCard>
      <div
        className="w-20 h-20 sm:w-28 sm:h-28 mx-auto mb-4 sm:mb-6 flex items-center justify-center"
        style={{
          filter: "drop-shadow(0 16px 40px var(--accent-glow))",
          animation: "floatGentle 3s ease-in-out infinite",
        }}
      >
        <img src={logoSymbol} alt="" className="w-20 h-20 sm:w-28 sm:h-28 block rounded-full" />
      </div>
      <Eyebrow>Bem-vindo(a) ao programa</Eyebrow>
      <h1 className="text-[clamp(24px,4.5vw,40px)] font-extrabold tracking-[-0.025em] leading-[1.1] mb-2 sm:mb-3">
        Cada Pocket que você for <span className="text-pcamp-pink">vira ponto</span>.
      </h1>
      <p className="text-sm sm:text-base text-white/70 leading-relaxed mb-5 sm:mb-8">
        Resgate o ponto da edição de hoje em 3 passos rápidos. Quem mais
        acumular pontos ao longo de 2026 leva os melhores prêmios.
      </p>

      <div className="grid gap-3 sm:gap-4 my-5 sm:my-8 p-4 sm:p-6 bg-white/[0.03] border border-white/10 rounded-xl">
        {[
          ["Insira o código do evento", "A organização anuncia durante o Pocket."],
          ["Identifique-se", "Use sempre o mesmo celular."],
          ["Receba seu ponto", "Veja seu saldo e histórico no painel."],
        ].map(([title, desc], i) => (
          <div key={i} className="flex gap-3 items-center sm:items-start text-sm leading-relaxed">
            <div className="flex-shrink-0 w-6 h-6 bg-pcamp-pink/[0.18] border border-pcamp-pink rounded-full flex items-center justify-center text-[11px] font-extrabold text-pcamp-pink">
              {i + 1}
            </div>
            <div>
              <strong className="text-white font-bold">{title}</strong>
              <span className="hidden sm:inline">
                {" — "}
                <span className="text-white/70">{desc}</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={onStart} block>
        Registrar pontos
        <Icon name="arrow" width="18" height="18" />
      </Button>
      <Button onClick={onViewPoints} variant="ghost" block className="mt-3">
        Ver meus pontos
      </Button>
    </StepCard>
  );
}

function LoginStep({
  name,
  phone,
  errors,
  submitting,
  onNameChange,
  onPhoneChange,
  onBack,
  onContinue,
}) {
  return (
    <StepCard>
      <Eyebrow>Passo 2 de 3 · Identificação</Eyebrow>
      <h1 className="text-[clamp(28px,4.5vw,40px)] font-extrabold tracking-[-0.025em] leading-[1.1] mb-3">
        Quem é você?
      </h1>
      <p className="text-base text-white/70 leading-relaxed mb-8">
        Use sempre o mesmo celular toda vez que vier — é assim que somamos seus
        pontos a cada Pocket.
      </p>

      <div className="grid gap-5">
        <FormField
          label="Nome"
          error={errors.name}
        >
          <Input
            type="text"
            placeholder="Como você quer ser chamado(a)"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            autoComplete="name"
            error={errors.name}
          />
        </FormField>

        <FormField label="Celular com DDD" error={errors.phone}>
          <Input
            type="tel"
            placeholder="(27) 99999-9999"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            inputMode="numeric"
            autoComplete="tel"
            error={errors.phone}
          />
        </FormField>

        <div className="flex gap-3 mt-2">
          <Button onClick={onBack} variant="ghost" className="flex-1">
            Voltar
          </Button>
          <Button onClick={onContinue} disabled={submitting} className="flex-1">
            {submitting ? "Registrando…" : "Resgatar meu ponto"}
            <Icon name="arrow" width="18" height="18" />
          </Button>
        </div>
      </div>
    </StepCard>
  );
}

function CodeStep({
  eventCode,
  errors,
  submitting,
  onCodeChange,
  onBack,
  onSubmit,
}) {
  return (
    <StepCard>
      <Eyebrow>Passo 1 de 3 · Código do evento</Eyebrow>
      <h1 className="text-[clamp(28px,4.5vw,40px)] font-extrabold tracking-[-0.025em] leading-[1.1] mb-3">
        Insira o <span className="text-pcamp-pink">código de hoje</span>
      </h1>
      <p className="text-base text-white/70 leading-relaxed mb-8">
        A organização do PCamp Pocket anuncia o código durante o evento. Esse
        código garante que só quem está aqui ganha o ponto.
      </p>

      <div className="grid gap-5">
        <FormField label="Código do evento" error={errors.code}>
          <input
            type="text"
            placeholder="EVENTO1"
            value={eventCode}
            onChange={(e) => onCodeChange(e.target.value)}
            maxLength={20}
            autoComplete="off"
            autoCapitalize="characters"
            className={[
              "w-full px-[18px] py-[22px] bg-white/[0.05] border-[1.5px] rounded-[10px] text-white text-[22px] font-semibold uppercase text-center tracking-[0.1em] font-sans transition-all",
              "placeholder:text-white/40 focus:outline-none focus:border-pcamp-pink focus:bg-white/[0.08]",
              errors.code ? "border-[var(--warn)]" : "border-white/20",
            ].join(" ")}
            style={{
              boxShadow: errors.code ? "none" : undefined,
            }}
            onFocus={(e) =>
              (e.target.style.boxShadow = "0 0 0 4px rgba(223, 12, 120, 0.18)")
            }
            onBlur={(e) => (e.target.style.boxShadow = "none")}
          />
        </FormField>

        <div className="flex gap-3 mt-2">
          <Button onClick={onBack} variant="ghost" className="flex-1">
            Voltar
          </Button>
          <Button onClick={onSubmit} disabled={submitting} className="flex-1">
            {submitting ? "Validando…" : "Continuar"}
            <Icon name="arrow" width="18" height="18" />
          </Button>
        </div>

        <p className="text-xs text-white/45 mt-3 leading-relaxed text-center">
          Não tem o código? Pergunte para a organização ou consulte o painel no
          telão do evento.
        </p>
      </div>
    </StepCard>
  );
}

function LookupStep({ phone, errors, submitting, onPhoneChange, onBack, onSubmit }) {
  return (
    <StepCard>
      <Eyebrow variant="cyan">Consulta de pontos</Eyebrow>
      <h1 className="text-[clamp(28px,4.5vw,40px)] font-extrabold tracking-[-0.025em] leading-[1.1] mb-3">
        Qual é o seu <span className="text-pcamp-pink">celular</span>?
      </h1>
      <p className="text-base text-white/70 leading-relaxed mb-8">
        Digite o mesmo número que você usou pra se cadastrar nos eventos.
      </p>

      <div className="grid gap-5">
        <FormField label="Celular com DDD" error={errors.lookup}>
          <Input
            type="tel"
            placeholder="(27) 99999-9999"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            inputMode="numeric"
            autoComplete="tel"
            error={errors.lookup}
          />
        </FormField>

        <div className="flex gap-3 mt-2">
          <Button onClick={onBack} variant="ghost" className="flex-1">
            Voltar
          </Button>
          <Button onClick={onSubmit} disabled={submitting} className="flex-1">
            {submitting ? "Buscando…" : "Ver meus pontos"}
          </Button>
        </div>
      </div>
    </StepCard>
  );
}

function SuccessStep({ user, alreadyClaimed, viewOnly, onReset, onAddCode }) {
  return (
    <StepCard>
      <div
        className="w-24 h-24 mx-auto mb-6 flex items-center justify-center rounded-full relative"
        style={{
          background: "rgba(105, 240, 174, 0.15)",
          animation: "pulseRing 1.4s ease-out",
        }}
      >
        <Icon
          name="check"
          width="48"
          height="48"
          style={{ color: "var(--success)", zIndex: 1 }}
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background: "rgba(105, 240, 174, 0.2)",
            animation: "pulseScale 1.4s ease-out",
          }}
        />
      </div>

      {viewOnly ? (
        <>
          <Eyebrow variant="cyan">Seus pontos</Eyebrow>
          <h1 className="text-[clamp(28px,4.5vw,40px)] font-extrabold tracking-[-0.025em] leading-[1.1] mb-3">
            Olá, {user.name.split(" ")[0]}!{" "}
            <span className="text-pcamp-pink">Aqui está seu saldo.</span>
          </h1>
          <p className="text-base text-white/70 leading-relaxed mb-8">
            Confira seus pontos e histórico de participação no PCamp Points.
          </p>
        </>
      ) : alreadyClaimed ? (
        <>
          <Eyebrow variant="cyan">Você já resgatou esse evento</Eyebrow>
          <h1 className="text-[clamp(28px,4.5vw,40px)] font-extrabold tracking-[-0.025em] leading-[1.1] mb-3">
            Ei {user.name.split(" ")[0]}, esse{" "}
            <span className="text-pcamp-pink">já tá com você</span>.
          </h1>
          <p className="text-base text-white/70 leading-relaxed mb-8">
            O ponto desse Pocket já foi computado. Confira seu saldo e histórico
            aí embaixo.
          </p>
        </>
      ) : (
        <>
          <Eyebrow>Passo 3 de 3 · Concluído!</Eyebrow>
          <h1 className="text-[clamp(28px,4.5vw,40px)] font-extrabold tracking-[-0.025em] leading-[1.1] mb-3">
            Boa, {user.name.split(" ")[0]}!{" "}
            <span className="text-pcamp-pink">Ponto registrado.</span>
          </h1>
          <p className="text-base text-white/70 leading-relaxed mb-8">
            Obrigado por estar com a gente. Aqui vai um resumo do seu saldo no
            PCamp Points.
          </p>
        </>
      )}

      <div
        className="text-center px-6 py-8 rounded-2xl my-6"
        style={{
          background:
            "linear-gradient(135deg, rgba(223, 12, 120, 0.15), rgba(223, 12, 120, 0.04))",
          border: "1px solid rgba(223, 12, 120, 0.3)",
        }}
      >
        <div className="text-xs font-bold tracking-[0.1em] uppercase text-pcamp-pink mb-1">
          Saldo total em 2026
        </div>
        <div>
          <span
            className="text-[88px] font-black tracking-[-0.04em] leading-none"
            style={{
              background: "linear-gradient(135deg, #FFFFFF, #F23A98)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {user.points}
          </span>
          <span className="text-base text-white/70 ml-2 font-medium">
            {user.points === 1 ? "ponto" : "pontos"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3 mb-6">
        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-[18px]">
          <div className="text-[11px] font-bold tracking-[0.08em] uppercase text-white/45 mb-1.5">
            Eventos
          </div>
          <div className="text-[22px] font-extrabold tracking-[-0.02em]">
            {user.events?.length || 0}
          </div>
        </div>
        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-[18px]">
          <div className="text-[11px] font-bold tracking-[0.08em] uppercase text-white/45 mb-1.5">
            Membro desde
          </div>
          <div className="text-[22px] font-extrabold tracking-[-0.02em]">
            {new Date(user.createdAt).toLocaleDateString("pt-BR", {
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>
      </div>

      <div className="text-[11px] font-bold tracking-[0.08em] uppercase text-white/45 mt-6 mb-3">
        Histórico
      </div>
      {(user.events || [])
        .slice()
        .reverse()
        .map((ev, i) => (
          <div
            key={i}
            className="flex justify-between items-center py-3.5 px-4 bg-white/[0.03] border border-white/10 rounded-[10px] mb-2"
          >
            <div>
              <div className="font-semibold text-sm mb-0.5">
                Pocket Vix · {ev.code}
              </div>
              <div className="text-xs text-white/45">
                {new Date(ev.date).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
            <div className="font-extrabold text-pcamp-pink text-sm">
              +{ev.pts} pt
            </div>
          </div>
        ))}

      {!viewOnly && (
        <Button onClick={onAddCode} block className="mt-6">
          Adicionar novo código
        </Button>
      )}
      <Button onClick={onReset} variant="ghost" block className={viewOnly ? "mt-6" : "mt-3"}>
        Voltar ao início
      </Button>
    </StepCard>
  );
}

// =============== UI PRIMITIVES ===============

function FormField({ label, error, children }) {
  return (
    <div className="grid gap-2">
      <label className="text-[13px] font-semibold text-white">{label}</label>
      {children}
      {error && <div className="text-[13px] text-[var(--warn)] mt-0.5">{error}</div>}
    </div>
  );
}

function Input({ error, ...props }) {
  return (
    <input
      {...props}
      className={[
        "w-full px-[18px] py-4 bg-white/[0.05] border-[1.5px] rounded-[10px] text-white text-base font-sans transition-all",
        "placeholder:text-white/40 focus:outline-none focus:border-pcamp-pink focus:bg-white/[0.08]",
        error ? "border-[var(--warn)]" : "border-white/20",
      ].join(" ")}
      onFocus={(e) =>
        (e.target.style.boxShadow = "0 0 0 4px rgba(223, 12, 120, 0.18)")
      }
      onBlur={(e) => (e.target.style.boxShadow = "none")}
    />
  );
}

function Button({ children, variant = "primary", block, className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 px-7 py-4 rounded-[10px] border-0 font-bold text-[15px] cursor-pointer transition-all font-sans no-underline disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary:
      "bg-pcamp-pink text-white shadow-[0_8px_24px_var(--accent-glow)] hover:bg-pcamp-pink-soft hover:-translate-y-px hover:shadow-[0_12px_32px_var(--accent-glow)] disabled:shadow-none disabled:hover:translate-y-0",
    ghost:
      "bg-transparent text-white border-[1.5px] border-white/20 hover:border-pcamp-pink hover:text-pcamp-pink",
  };
  return (
    <button
      {...props}
      className={`${base} ${variants[variant]} ${block ? "w-full" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

// =============== RANKING PÚBLICO ===============
function PublicRanking() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    getRanking()
      .then((r) => setRanking(r.slice(0, 20)))
      .catch((err) => console.error("[PublicRanking]", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="relative z-[1] max-w-[1100px] mx-auto px-6 py-16 border-t border-white/10">
      <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-pcamp-pink mb-3">
        Ranking 2026
      </div>
      <h2 className="text-[clamp(28px,4vw,36px)] font-extrabold tracking-[-0.02em] leading-[1.15] mb-3">
        Top participantes do ano
      </h2>
      <p className="text-[15px] text-white/70 max-w-[600px] leading-relaxed mb-8">
        Quem mais participar dos Pockets leva os melhores prêmios. Confira quem está na frente.
      </p>

      {loading ? (
        <p className="text-white/60 text-sm">Carregando...</p>
      ) : ranking.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-8 text-center">
          <p className="text-white/45 text-sm">Nenhum participante no ranking ainda. Seja o primeiro!</p>
        </div>
      ) : (
        <div className="grid gap-2 max-w-[600px]">
          {ranking.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-4 py-3.5 px-5 bg-white/[0.03] border border-white/10 rounded-xl"
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
                <div className="font-bold text-sm text-white truncate">{p.name}</div>
                <div className="text-xs text-white/45">
                  {p.totalEvents} evento{p.totalEvents !== 1 ? "s" : ""}
                </div>
              </div>
              <div>
                <span className="text-lg font-extrabold text-pcamp-pink">{p.points}</span>
                <span className="text-xs text-white/45 ml-1">{p.points === 1 ? "pt" : "pts"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// =============== COMUNIDADE + EM BREVE ===============
function SoonSection() {
  return (
    <section className="relative z-[1] max-w-[1100px] mx-auto px-6 py-16 border-t border-white/10">
      <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-pcamp-pink mb-3">
        Comunidade &amp; novidades
      </div>
      <h2 className="text-[clamp(28px,4vw,36px)] font-extrabold tracking-[-0.02em] leading-[1.15] mb-3">
        O programa vai crescer ao longo de 2026.
      </h2>
      <p className="text-[15px] text-white/70 max-w-[600px] leading-relaxed mb-8">
        Entre na comunidade do WhatsApp e fique por dentro dos próximos eventos, novidades e prêmios.
      </p>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        {/* WhatsApp — ativo */}
        <a
          href="https://chat.whatsapp.com/Itstg9z6Ctk9vzNRtvLtmd"
          target="_blank"
          rel="noreferrer"
          className="bg-[rgba(37,211,102,0.08)] border border-[rgba(37,211,102,0.3)] rounded-xl p-6 no-underline hover:bg-[rgba(37,211,102,0.12)] transition-all"
        >
          <span className="inline-block text-[10px] font-bold tracking-[0.12em] uppercase text-[#25D366] bg-[rgba(37,211,102,0.12)] border border-[rgba(37,211,102,0.3)] px-2 py-[3px] rounded mb-3.5">
            Entrar agora
          </span>
          <h3 className="text-base font-bold tracking-[-0.01em] mb-1 text-white">Comunidade WhatsApp</h3>
          <p className="text-[13px] text-white/70 leading-relaxed">
            Participe do grupo da comunidade PCamp Pocket Vix e fique por dentro de tudo.
          </p>
        </a>

        {/* Em breve */}
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
          <span className="inline-block text-[10px] font-bold tracking-[0.12em] uppercase text-white/45 bg-white/[0.05] border border-white/10 px-2 py-[3px] rounded mb-3.5">
            Em breve
          </span>
          <h3 className="text-base font-bold tracking-[-0.01em] mb-1">Indique e Ganhe</h3>
          <p className="text-[13px] text-white/70 leading-relaxed">
            Traga alguém novo pro Pocket e ganhe pontos extras quando ele fizer check-in.
          </p>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
          <span className="inline-block text-[10px] font-bold tracking-[0.12em] uppercase text-white/45 bg-white/[0.05] border border-white/10 px-2 py-[3px] rounded mb-3.5">
            Em breve
          </span>
          <h3 className="text-base font-bold tracking-[-0.01em] mb-1">Resgate de brindes</h3>
          <p className="text-[13px] text-white/70 leading-relaxed">
            Troque seus pontos por brindes exclusivos do PCamp Pocket Vix.
          </p>
        </div>
      </div>
    </section>
  );
}
