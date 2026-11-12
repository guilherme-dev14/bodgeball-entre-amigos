# BodgeBall entre amigos

Carregador para abrir a cópia de teste do BodgeBall no Windows e conectar amigos pela internet usando códigos de sala. O primeiro participante é o anfitrião. A meta do grupo é jogar de 2v2 até 4v4, sem mensalidade de servidor.

## Baixar e jogar

Baixe **BodgeBall-entre-amigos-Windows.zip** na [página de versões](https://github.com/guilherme-dev14/bodgeball-entre-amigos/releases). Use o pacote anexado à versão; os arquivos automáticos “Source code” contêm somente o projeto de desenvolvimento.

1. Todos extraem o ZIP inteiro em seu próprio PC com Windows 10/11 x64.
2. Abram `INICIAR-WINDOWS.cmd` e mantenham a janela do carregador aberta. Ele abre Chrome ou Edge e já inclui o runtime necessário.
3. O anfitrião informa um apelido e clica em **Criar sala**. Depois do carregamento, **Tab** mostra o código.
4. Os amigos abrem o pacote em seus próprios computadores, informam o apelido e o mesmo código e clicam em **Entrar**.
5. Em **Tab → Create Custom Game**, o anfitrião escolhe mapa e modo. Os participantes usam **Join Team** para dividir os times.
6. Os convidados clicam em **Ready Up**. O anfitrião clica em **Start Match**.

**Compartilhem somente o código.** O botão original **Copy Link** copia um endereço local, que não funciona como convite em outra casa. O anfitrião precisa manter o jogo aberto, a aba visível e o computador acordado.

O arquivo [PASSO-A-PASSO.txt](BodgeBall-entre-amigos/PASSO-A-PASSO.txt) inclui instruções e solução de problemas.

## Como funciona

O servidor de arquivos atende apenas `127.0.0.1`. Cada computador carrega seus próprios arquivos; a comunicação da partida usa o WebRTC/PeerJS que já veio no jogo. Hospedar este repositório como página estática não transforma a partida em servidor dedicado.

O ajuste de compatibilidade normaliza mensagens estruturadas como JSON antes do envio, preservando pacotes binários. Isso evita a conversão de campos `undefined` em `null` que impedia a entrada correta de convidados. Regras, mapas e modelos foram preservados.

## Estado dos testes

- Quatro sessões no mesmo computador conectaram e iniciaram um 2v2.
- Um jogador e sete bots iniciaram 4v4, com eliminações e troca de rodada.
- O iniciador final criou uma sala e conectou um convidado usando apelido e código.
- O servidor de arquivos tem testes de entrega, MIME, intervalos de bytes e isolamento de caminhos.
- O `node.exe` incluído confere com o SHA256 oficial do Node.js.
- Ainda falta testar o iniciador em um Windows real e oito pessoas em redes diferentes. Os testes locais não comprovam desempenho nem conectividade entre casas.

## Organização para futuras alterações

- `BodgeBall-entre-amigos/abrir.html`: tela de apelido, criação e entrada em salas.
- `BodgeBall-entre-amigos/servidor.cjs`: carregador de arquivos e abertura do navegador.
- `scripts/preparar_jogo.py`: extrai o build de `app.asar`, verifica a integridade e aplica o ajuste de transporte conhecido.
- `scripts/empacotar.py`: gera o ZIP de Windows e seu SHA256.
- `tests/`: verificações do carregador e do ajuste.

Este repositório versiona o carregador, instruções, scripts e ajustes. Os arquivos grandes do jogo e o runtime ficam no pacote de cada versão. O material recebido do jogo é um **build compilado**, portanto alterações profundas nas mecânicas exigem trabalho adicional sobre esse build.

## Desenvolvimento

Requisitos: Node.js 22+ e Python 3.9+ para preparação e empacotamento. O pacote pronto para jogar já inclui Node.js para Windows.

```sh
git clone https://github.com/guilherme-dev14/bodgeball-entre-amigos.git
cd bodgeball-entre-amigos
node --test tests/servidor.test.cjs
python3 -m unittest discover -s tests -p 'test_*.py'
```

Para trabalhar a partir do pacote de uma versão, copie as pastas `jogo/` e `runtime/` do ZIP para `BodgeBall-entre-amigos/` neste projeto. Elas são ignoradas pelo Git. Depois:

```sh
node BodgeBall-entre-amigos/servidor.cjs
python3 scripts/empacotar.py
```

Alternativamente, prepare o jogo a partir do `app.asar` fornecido, sem executar o arquivo:

```sh
python3 scripts/preparar_jogo.py /caminho/para/app.asar
```

O script aceita apenas a versão conhecida do bundle. Se encontrar outro build, para antes de publicar arquivos. Não sobrescreve uma pasta `jogo/` já existente. O runtime pode ser recuperado do pacote de uma versão; sua origem e hash ficam em `runtime/ORIGEM.json`.

O ZIP resultante aparece em `dist/`. Publique uma nova versão com uma tag e anexe o ZIP e o arquivo `.sha256` correspondente.
