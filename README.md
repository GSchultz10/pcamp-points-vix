# PCamp Points · Vix

Landing page do programa de pontos do PCamp Pocket Vitória/ES. Cada presença em um Pocket = 1 ponto. No fim de 2026, quem mais participar leva os melhores prêmios.

## Stack

- **Vite + React 18** — build rápido, sem ceremony
- **Tailwind CSS** — utilitários + tokens da marca PCamp
- **Supabase** — backend (Postgres + REST + Auth, plano free tier)
- **Sem auth de usuário** — identificação por celular (sem senha, validação por máscara)

## Como rodar localmente

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha `.env` com as credenciais do seu projeto Supabase (veja seção abaixo).

> **Sem Supabase configurado?** O projeto faz fallback automático para `localStorage` — você pode rodar e testar tudo localmente antes de criar a conta. Códigos válidos no modo local: `EVENTO1`, `EVENTO2`, `VIX2026`, `POCKET01`.

### 3. Rodar

```bash
npm run dev
```

Abre em `http://localhost:5173`.

## Configurar o Supabase

### 1. Criar projeto

1. Acesse [supabase.com](https://supabase.com) → **New project**
2. Escolha região `South America (São Paulo)` pra latência baixa
3. Salve a senha do banco (você não vai precisar dela no front, mas pode precisar pra acessar SQL direto)

### 2. Rodar o schema

1. No dashboard do projeto, vá em **SQL Editor** → **New query**
2. Cole o conteúdo de `supabase/schema.sql`
3. Clique em **Run**

Isso cria as tabelas `events`, `users`, `checkins`, a view `ranking`, e configura as policies de RLS (Row Level Security) pro cliente anônimo conseguir inserir check-ins sem comprometer a segurança.

### 3. Cadastrar códigos de eventos

Cada Pocket precisa ter seu código cadastrado pra ser aceito. No SQL Editor:

```sql
insert into public.events (code, name, event_date, active) values
  ('POCKET-MAR26', 'PCamp Pocket Vix · Março/26', '2026-03-15', true);
```

Pra desativar um código (ex: depois que o evento acabou):

```sql
update public.events set active = false where code = 'POCKET-MAR26';
```

### 4. Pegar as credenciais

1. Dashboard Supabase → **Settings** → **API**
2. Copie:
   - **Project URL** → vai em `VITE_SUPABASE_URL`
   - **anon public** → vai em `VITE_SUPABASE_ANON_KEY`
3. Cole no seu `.env`

> A chave `anon` é segura pra ficar no front — as policies de RLS controlam o que ela pode fazer.

## Estrutura

```
pcamp-points-vix/
├── src/
│   ├── App.jsx                  # Componente principal (orquestra steps)
│   ├── main.jsx                 # Entrypoint React
│   ├── index.css                # Tailwind + tokens CSS + animações
│   ├── assets/
│   │   ├── logo-full.png        # Logo horizontal "pcamp productcamp"
│   │   └── logo-symbol.png      # Bola circular "pcamp"
│   ├── components/
│   │   └── Stepper.jsx          # Indicador visual de etapas
│   └── lib/
│       ├── supabase.js          # Cliente Supabase com guard de credenciais
│       ├── dataRepository.js    # Camada de dados (Supabase + fallback localStorage)
│       └── validation.js        # Helpers de validação e formatação
├── supabase/
│   └── schema.sql               # Schema completo + RLS + view ranking
├── public/
│   └── favicon.svg
├── .env.example
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.js
```

## Fluxo do usuário

1. **Welcome** — pessoa escaneia o QR do crachá → cai na LP → vê visão geral em 3 bullets → clica "Começar"
2. **Login** — digita nome + telefone (com máscara `(DD) 9XXXX-XXXX` e validação)
3. **Código do evento** — digita o código que a organização anuncia no telão
4. **Sucesso** — vê saldo total, contagem de eventos, histórico

Identificação é por **celular** (sem senha, sem SMS, sem código). Voltando em outro Pocket e usando o mesmo número, a pessoa acumula no mesmo perfil.

## Lógica de pontuação

- **+1 ponto** por check-in em um evento válido
- Constraint `UNIQUE (user_id, event_id)` no banco impede ponto duplicado
- Tentativa de resgatar o mesmo código duas vezes → tela amigável avisando "você já resgatou esse evento"

## Deploy

### Vercel (recomendado)

```bash
npm install -g vercel
vercel
```

Configure as variáveis de ambiente no painel da Vercel (`Settings → Environment Variables`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Netlify, Cloudflare Pages, etc

Funciona igual — qualquer host de site estático serve. Build command: `npm run build`. Output: `dist`.

## Roadmap

- [x] Check-in por presença + pontuação
- [x] Identificação por celular sem senha
- [x] Validação de código de evento
- [ ] Indicação de campers (+ pontos quando o indicado fizer check-in)
- [ ] Ranking público
- [ ] Resgate de brindes
- [ ] Engajamento via WhatsApp (pontos por participação no grupo)
- [ ] Painel admin pra organização (cadastro de eventos, exportação)

## Comandos úteis

```bash
npm run dev      # ambiente de desenvolvimento
npm run build    # build de produção em ./dist
npm run preview  # roda o build localmente pra testar
```

## Dúvidas frequentes

**E se a pessoa errar o telefone?** Pode voltar pra etapa anterior pelo botão "Voltar" sem perder os dados.

**E se duas pessoas usarem o mesmo telefone?** Hoje, o sistema considera o mesmo perfil (mesma chave). Se virar problema, dá pra plugar SMS-OTP via Supabase Auth depois.

**Como mudo cores ou copy?** Cores ficam em `tailwind.config.js` (paleta `pcamp.*`). Copy fica direto no `App.jsx`.

**E o ranking?** A view `ranking` já tá pronta no banco — basta consumir em uma página `/ranking` quando for hora de liberar.
