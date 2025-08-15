// sheets.js - VERSÃO FINAL PARA HEROKU COM VARIÁVEL DE AMBIENTE
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const SPREADSHEET_ID = '1-u-WSLEpz7_537FytU_gK3bm3sKm-8Rkw2Fn3MFvRJ4';

// --- CRIAÇÃO TEMPORÁRIA DO ARQUIVO DE CREDENCIAIS ---
const PUPPETEER_EXECUTABLE_PATH = path.join(__dirname, 'credentials-temp.json');

if (!fs.existsSync(PUPPETEER_EXECUTABLE_PATH)) {
  if (!process.env.PUPPETEER_EXECUTABLE_PATH) {
    console.error('[ERRO FATAL] A variável de ambiente GOOGLE_CREDENTIALS não foi definida!');
    process.exit(1);
  }
  fs.writeFileSync(PUPPETEER_EXECUTABLE_PATH, process.env.PUPPETEER_EXECUTABLE_PATH);
  console.log('[INFO] Arquivo de credenciais temporário criado com sucesso.');
}

// --- DEPURAÇÃO ---
console.log('--- INICIANDO VERIFICAÇÃO DE CREDENCIAIS ---');
console.log(`[INFO] O script 'sheets.js' está na pasta: ${__dirname}`);
console.log(`[INFO] Procurando pelo arquivo de credenciais em: ${PUPPETEER_EXECUTABLE_PATH}`);

if (fs.existsSync(PUPPETEER_EXECUTABLE_PATH)) {
    console.log('[SUCESSO] O arquivo de credenciais TEMPORÁRIO foi ENCONTRADO.');
} else {
    console.error('[ERRO FATAL] O arquivo de credenciais TEMPORÁRIO NÃO FOI ENCONTRADO!');
}
console.log('--- FIM DA VERIFICAÇÃO ---');

// --- FUNÇÕES ---
async function autenticar() {
  const auth = new google.auth.GoogleAuth({
    keyFile: PUPPETEER_EXECUTABLE_PATH,
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

    if (valores.length === 0) return;
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:D`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: valores },
    });
    console.log(`✅ ${valores.length} notícia(s) adicionada(s) na aba "${sheetName}".`);
  } catch (error) {
    console.error(`❌ Erro ao adicionar notícias na aba "${sheetName}":`, error.message);
    throw error;
  }
}

module.exports = { adicionarNoticias };
