# CLAUDE.md

Contexto e convenções deste projeto pro Claude Code. Lê isso antes de fazer mudanças.

## Visão geral

LP de gamificação de presença em eventos do **PCamp Pocket Vitória/ES**. Pessoa escaneia QR no crachá → cai aqui → digita nome, telefone e código do evento → ganha 1 ponto. Quem acumular mais pontos em 2026 leva os melhores prêmios.

## Stack

- **Vite + React 18** (sem TypeScript — projeto pequeno, valor não compensaria)
- **Tailwind CSS 3** com paleta da marca configurada (`tailwind.config.js`)
- **Supabase** (Postgres + REST) — backend único, sem servidor próprio
- Identificação **sem senha**: chave de negócio é o telefone (`phone_key`, só dígitos)

## Arquitetura

### Princípio principal: separação de camadas

```
App.jsx (UI / state de fluxo)
   │
   ▼
src/lib/dataRepository.js (camada de dados — única que toca em storage)
   │
   ├──► src/lib/supabase.js (cliente real, se configurado)
   └──► localStorage (fallback automático pra dev)
```

**Regra**: o componente NUNCA chama `supabase.from(...)` direto, NUNCA acessa `localStorage` direto. Tudo passa por `dataRepository.js`. Isso garante que:

- Dá pra rodar localmente sem configurar Supabase
- Trocar storage não toca em UI
- Testar a UI fica trivial

### Steps

A LP tem 4 estados controlados por `step` em `App.jsx`:

1. `welcome` — boas-vindas
2. `login` — nome + telefone
3. `code` — código do evento
4. `success` — confirmação + dashboard

Cada step é um componente local em `App.jsx` (`WelcomeStep`, `LoginStep`, `CodeStep`, `SuccessStep`). Não foram extraídos pra arquivos separados de propósito — fluxo linear de wizard, não vale a indireção.

## Modelo de dados (Supabase)

```sql
events (id, code UNIQUE, name, event_date, active)
users (id, phone_key UNIQUE, phone_formatted, name, created_at, last_seen)
checkins (id, user_id FK, event_id FK, event_code, points, created_at, UNIQUE(user_id, event_id))
```

A constraint `UNIQUE(user_id, event_id)` é a que garante anti-duplicidade — não confiamos em verificação no front.

A view `ranking` agrega total de pontos por usuário (já pronta pra ser consumida no roadmap futuro).

### RLS (Row Level Security)

Todas as tabelas têm RLS ativo. Policies permitem:

- `events`: anon SELECT só onde `active = true`
- `users`: anon SELECT/INSERT/UPDATE (necessário pro upsert do checkin)
- `checkins`: anon SELECT/INSERT (sem auth, ranking é público por design)

Se for adicionar Auth real depois, refazer policies pra usar `auth.uid()`.

## Paleta de cores

**Não invente cores.** Use os tokens em `tailwind.config.js`:

```js
pcamp.pink        // #DF0C78  — acento principal
pcamp.pink-soft   // #F23A98  — hover
pcamp.purple      // #2B1E39  — fundo médio
pcamp.purple-deep // #1A1226  — fundo profundo
pcamp.white       // #FFFFFF
```

CSS variables em `src/index.css` espelham os mesmos valores pra uso fora do Tailwind (ex: `boxShadow`, `background` em inline styles).

## Validação

Helpers em `src/lib/validation.js`:

- `formatPhone(raw)` — aplica máscara `(DD) 9XXXX-XXXX` enquanto digita
- `isValidPhone(formatted)` — valida BR: 11 dígitos, DDD válido, 9º dígito = 9
- `normalizeEventCode(code)` — uppercase + sem espaços

**Toda entrada de telefone passa por `formatPhone`** no `onChange`. Toda validação de submit passa por `isValidPhone`.

## Convenções de código

- Componentes: **PascalCase**, default export
- Funções utilitárias: **camelCase**, named export
- Arquivos: **camelCase.js** pra utilitários, **PascalCase.jsx** pra componentes
- Strings em pt-BR (UI fala com usuário brasileiro)
- Commits sem regras rígidas, mas prefira conventional commits (`feat:`, `fix:`, `chore:`)
- Sem prop-types ou TypeScript — projeto é pequeno o suficiente pra dispensar

## Tarefas comuns (pro Claude Code resolver)

### Adicionar novo evento

```sql
insert into public.events (code, name, event_date, active) values
  ('POCKET-XXX', 'Nome do Evento', '2026-MM-DD', true);
```

Roda no SQL Editor do Supabase.

### Mudar copy

Direto no `App.jsx`. Os textos visíveis pro usuário ficam dentro dos componentes `WelcomeStep`, `LoginStep`, `CodeStep`, `SuccessStep` e `SoonSection`.

### Mudar cores

Edita `tailwind.config.js` (paleta `pcamp.*`) E `src/index.css` (CSS vars `--accent`, etc). Os dois precisam ficar em sync.

### Adicionar novo step

1. Adicionar novo valor em `step` (state em App.jsx)
2. Atualizar mapping em `Stepper.jsx` (`stepIndex` e total de bolinhas)
3. Criar componente `XxxStep` no fim do `App.jsx`
4. Adicionar branch `{step === "xxx" && <XxxStep ... />}` no JSX principal

### Plugar nova fonte de pontuação (ex: indicação)

1. Adicionar coluna ou tabela no Supabase (provavelmente uma nova tabela `referrals` ou expandir `checkins` com `kind`)
2. Adicionar função no `dataRepository.js` (com fallback localStorage)
3. Implementar a UI consumindo essa função

### Criar página de ranking

A view `public.ranking` já existe. Criar componente que faz `supabase.from('ranking').select('*').limit(20)`.

## O que NÃO fazer

- ❌ Não chamar `supabase.from(...)` ou `localStorage` direto em componentes — sempre passar por `dataRepository.js`
- ❌ Não criar novas variantes de cor fora da paleta `pcamp.*`
- ❌ Não adicionar autenticação real sem revisar as RLS policies primeiro
- ❌ Não confiar em validação só no front — Supabase tem a constraint `UNIQUE` como fonte da verdade
- ❌ Não introduzir TypeScript ou prop-types — manter o projeto enxuto
- ❌ Não adicionar bibliotecas pesadas sem justificar (icons inline, sem framer-motion etc)

## Roadmap (em ordem de prioridade)

1. **Painel admin** pra organização cadastrar eventos sem mexer no SQL Editor
2. **Página /ranking** pública consumindo a view
3. **Indicação de campers** (com tabela `referrals` linkando indicador → indicado)
4. **Resgate de brindes** (tabela `rewards` + `redemptions`)
5. **Bot WhatsApp** pra check-ins via DM (mais longo prazo)

## Comandos

```bash
npm run dev      # dev server em :5173
npm run build    # build de produção
npm run preview  # testa o build local
```

## Quando estiver em dúvida

- Padrão é simplicidade. Se a solução parece complexa, provavelmente tem caminho mais simples.
- Mantenha o fluxo de 4 steps enxuto — qualquer feature nova deve ser uma camada por cima, não dentro do wizard.
- O usuário final é alguém ESCANEANDO QR no celular durante um evento. Mobile-first sempre. Não dá pra exigir paciência.
