const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = '1-u-WSLEpz7_537FytU_gK3bm3sKm-8Rkw2Fn3MFvRJ4';

async function autenticar() {
  // Se a variável de ambiente GOOGLE_CREDENTIALS_BASE64 existir, use-a
  if (process.env.GOOGLE_CREDENTIALS_BASE64) {
    console.log('Usando credenciais da variável de ambiente (Base64).');
    
    // Decodifica a string Base64 para JSON
    const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8'));
    
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return await auth.getClient();
  } else {
    // Caso contrário, use o arquivo local para desenvolvimento
    console.log('Usando arquivo de credenciais local para desenvolvimento.');
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return await auth.getClient();
  }
}

async function adicionarNoticias(noticias, sheetName) {
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

  console.log('Dados para inserir:', valores);

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:D`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: valores },
    });
    console.log(`✅ ${valores.length} notícia(s) adicionada(s) na aba "${sheetName}".`);
  } catch (error) {
    console.error('❌ Erro ao adicionar notícias:', error.message);
  }
}

module.exports = { adicionarNoticias };