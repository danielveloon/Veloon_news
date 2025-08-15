const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const SPREADSHEET_ID = '1-u-WSLEpz7_537FytU_gK3bm3sKm-8Rkw2Fn3MFvRJ4';

// --- CRIAÇÃO TEMPORÁRIA DO ARQUIVO DE CREDENCIAIS ---
const CREDENTIALS_PATH = path.join(__dirname, 'credentials-temp.json');

if (!fs.existsSync(CREDENTIALS_PATH)) {
  if (!process.env.CREDENTIALS_PATH) {
    console.error('[ERRO FATAL] A variável de ambiente CREDENTIALS_PATH não foi definida!');
    process.exit(1);
  }

  const credJson = process.env.CREDENTIALS_PATH.replace(/\\n/g, '\n');
  fs.writeFileSync(CREDENTIALS_PATH, credJson);
  console.log('[INFO] Arquivo de credenciais temporário criado com sucesso.');
}

// --- DEPURAÇÃO ---
console.log('--- INICIANDO VERIFICAÇÃO DE CREDENCIAIS ---');
console.log(`[INFO] O script 'sheets.js' está na pasta: ${__dirname}`);
console.log(`[INFO] Procurando pelo arquivo de credenciais em: ${CREDENTIALS_PATH}`);

if (fs.existsSync(CREDENTIALS_PATH)) {
  console.log('[SUCESSO] O arquivo de credenciais TEMPORÁRIO foi ENCONTRADO.');
} else {
  console.error('[ERRO FATAL] O arquivo de credenciais TEMPORÁRIO NÃO FOI ENCONTRADO!');
}
console.log('--- FIM DA VERIFICAÇÃO ---');

// --- FUNÇÕES ---
async function autenticar() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return await auth.getClient();
}

async function adicionarNoticias(noticias, sheetName) {
  try {
    const authClient = await autenticar();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    const valores = Array.isArray(noticias[0])
      ? noticias
      : noticias.map(n => [
          n.dataAttr || new Date().toLocaleDateString('pt-BR'),
          n.conteudo || n.resumo || '',
          n.titulo || '',
          n.link || ''
        ]);

    if (valores.length === 0) {
      console.log('[INFO] Nenhuma notícia para enviar.');
      return;
    }

    console.log('📤 Valores a enviar para o Google Sheets:', valores);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:D`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: valores },
    });

    console.log(`✅ ${valores.length} notícia(s) adicionada(s) na aba "${sheetName}".`);
  } catch (error) {
    console.error(`❌ Erro ao adicionar notícias na aba "${sheetName}":`, error);
    throw error;
  }
}

module.exports = { adicionarNoticias };
