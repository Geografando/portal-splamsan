# Portal público SPLAMSAN

Arquivos do passo 6 do MVP, agora com mapa Leaflet:

- `index.html`: estrutura da página inicial.
- `styles.css`: identidade visual e responsividade.
- `app.js`: consulta às views públicas do Supabase e renderização dos indicadores.

## Teste local

Por segurança do navegador, abra os arquivos por um servidor HTTP local, não apenas com duplo clique.

Exemplo, em uma pasta contendo os três arquivos:

```bash
python -m http.server 8080
```

Depois acesse:

```text
http://localhost:8080
```

## Configuração

No início de `app.js`, revise:

- `supabaseUrl`
- `publishableKey`
- `tooljetUrl`

A chave presente é pública e funciona somente conforme os privilégios concedidos ao papel `anon` no Supabase.

## Próximo passo

Adicionar o mapa Leaflet no mesmo portal, utilizando `latitude` e `longitude` retornadas por `vw_portal_municipios`.


## Mapa

Leaflet 1.9.4, OpenStreetMap, marcadores coloridos por progresso e popups com navegação para detalhes.
