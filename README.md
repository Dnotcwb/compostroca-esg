# Compostroca ESG — Dashboard ESG B2B

Dashboard ESG B2B "Ambiente Livre" para monitoramento de impacto ambiental,
rastreabilidade de compostagem e mercado de Tokens CAU.

## Tecnologia

Aplicação de **arquivo único** (`index.html`) que roda 100% no navegador:

- **React 18** + **lucide-react** via [esm.sh](https://esm.sh)
- **Babel Standalone** (transpila o JSX no navegador) — versão **fixada** em `8.0.2`
- **TailwindCSS** via CDN
- **Leaflet** para os mapas de impacto

Não há etapa de build. O deploy publica o `index.html` direto na raiz
(ver `netlify.toml`).

## Deploy

Hospedado no Netlify (https://compostroca-esg.netlify.app), com deploy
automático a cada push na branch `main`.

## Histórico de correções

A tela ficava preta porque as CDNs eram carregadas sem versão fixada e o
Babel atualizou para a major 8, que (1) passou a rejeitar `>` solto em texto
JSX e (2) passou a usar o *automatic JSX runtime*, exigindo um *import map*
para resolver `react/jsx-runtime`. Ambos foram corrigidos e o Babel foi
fixado em `8.0.2`.
