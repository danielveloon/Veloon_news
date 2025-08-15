// sheets.js - VERSÃO FINAL E ROBUSTA
const { google } = require('googleapis');
const path = require('path'); // Módulo nativo do Node.js para lidar com caminhos
const fs = require('fs');   // Módulo nativo do Node.js para lidar com arquivos

const SPREADSHEET_ID = '1-u-WSLEpz7_537FytU_gK3bm3sKm-8Rkw2Fn3MFvRJ4';

// --- LÓGICA INTELIGENTE PARA ENCONTRAR O ARQUIVO ---
// '__dirname' é uma variável especial que sempre contém o caminho da pasta onde este script (sheets.js) está.
// 'path.join' junta o caminho da pasta com o nome do arquivo, criando o caminho completo e correto.
const PUPPETEER_EXECUTABLE_PATH = path.join(__dirname, 'credentials.json');


// --- Bloco de Verificação e Depuração ---
console.log('--- INICIANDO VERIFICAÇÃO DE CREDENCIAIS ---');
console.log(`[INFO] O script 'sheets.js' está na pasta: ${__dirname}`);
console.log(`[INFO] Procurando pelo arquivo de credenciais em: ${PUPPETEER_EXECUTABLE_PATH}`);

if (fs.existsSync(PUPPETEER_EXECUTABLE_PATH)) {
    console.log('[SUCESSO] O arquivo credentials.json foi ENCONTRADO.');
} else {
    console.error('[ERRO FATAL] O arquivo credentials.json NÃO FOI ENCONTRADO na mesma pasta que o sheets.js.');
}
console.log('--- FIM DA VERIFICAÇÃO ---');
// --- Fim do Bloco de Verificação ---


async function autenticar() {
  const auth = new google.auth.GoogleAuth({
    keyFile: PUPPETEER_EXECUTABLE_PATH, // Usando o caminho completo e correto
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
      return;
    }
    
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