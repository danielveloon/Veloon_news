// main.js unificado
require('dotenv').config();
// 1. Mude para puppeteer-core
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const {
  coletarNoticiasEstadao,
  pegarConteudoNoticia,
  coletarNoticiasTheNews,
  coletarNoticiasValor,
  pegarConteudoNoticiaValor
} = require('./scraper'); 
const { adicionarNoticias } = require('./sheets');

// --- Função para coletar e processar notícias do Estadão ---
async function processarEstadao(browser) {
  console.log('🔍 Coletando notícias do Estadão (somente de hoje)');
  const noticiasComConteudo = [];

  try {
    const noticiasEstadao = await coletarNoticiasEstadao('https://www.estadao.com.br/ultimas/', browser);

    for (const noticia of noticiasEstadao) {
      if (noticia.titulo.includes('Som a Pino') || noticia.titulo.includes('Start Eldorado')) {
        console.log(`\n⏭️ Pulando notícia: "${noticia.titulo}"`);
        continue;
      }

      console.log(`\n📰 Título: ${noticia.titulo}`);
      console.log(`🔗 Link: ${noticia.link}`);

      const resultado = await pegarConteudoNoticia(noticia.link, noticia.titulo, browser);
      const conteudoFinal = resultado.texto.length > 0 ? resultado.texto : 'Conteúdo não disponível';

      noticiasComConteudo.push({
        titulo: noticia.titulo,
        link: noticia.link,
        conteudo: conteudoFinal
      });

      console.log(`📝 Conteúdo do corpo:\n${resultado.texto}\n`);
    }

    const dadosParaPlanilha = noticiasComConteudo.map(n => [
      new Date().toLocaleDateString('pt-BR'),
      n.conteudo,
      n.titulo,
      n.link
    ]);

    if (dadosParaPlanilha.length > 0) {
      await adicionarNoticias(dadosParaPlanilha, 'Estadão');
      console.log(`✅ ${dadosParaPlanilha.length} notícia(s) adicionada(s) à aba "Estadão".`);
    }
  } catch (error) {
    console.error('Erro no fluxo do Estadão:', error.message);
  }
}

// --- Função para coletar e processar notícias do TheNews ---
async function processarTheNews(browser) {
  console.log('\n🔍 Coletando notícias do TheNews (somente de hoje)');
  try {
    const noticiasTheNews = await coletarNoticiasTheNews('https://thenewscc.beehiiv.com/', browser);
    console.log(`🟢 TheNews (notícias coletadas):`, noticiasTheNews.length);

    if (noticiasTheNews.length > 0) {
      await adicionarNoticias(noticiasTheNews, 'TheNews');
      console.log(`✅ ${noticiasTheNews.length} notícia(s) adicionada(s) à aba "TheNews".`);
    } else {
      console.log('Nenhuma notícia do TheNews para hoje.');
    }
  } catch (error) {
    console.error('Erro no fluxo do TheNews:', error.message);
  }
}

// --- Função para coletar e processar notícias do Valor Econômico ---
async function processarValor(browser) {
  console.log('\n🔍 Coletando notícias do Valor Econômico (somente de hoje)');
  const noticiasComConteudo = [];
  const linksAdicionados = new Set();

  try {
    const noticiasValor = await coletarNoticiasValor('https://valor.globo.com/ultimas-noticias/', browser);

    if (!Array.isArray(noticiasValor)) {
      throw new Error('noticiasValor não é um array');
    }

    for (const noticia of noticiasValor) {
      if (linksAdicionados.has(noticia.link)) {
        console.log(`⏭️ Pulando notícia duplicada: "${noticia.titulo}"`);
        continue;
      }
      linksAdicionados.add(noticia.link);

      console.log(`\n📰 Título: ${noticia.titulo}`);
      console.log(`🔗 Link: ${noticia.link}`);

      const resultado = await pegarConteudoNoticiaValor(noticia.link, noticia.titulo, browser);
      if (!resultado.texto || resultado.texto.trim().length === 0) {
        console.log('⏭️ Conteúdo não disponível, pulando notícia.');
        continue;
      }

      noticiasComConteudo.push({
        titulo: noticia.titulo,
        link: noticia.link,
        conteudo: resultado.texto
      });

      console.log(`📝 Conteúdo do corpo:\n${resultado.texto}\n`);
    }

    const dadosParaPlanilha = noticiasComConteudo.map(n => [
      new Date().toLocaleDateString('pt-BR'),
      n.conteudo,
      n.titulo,
      n.link
    ]);

    if (dadosParaPlanilha.length > 0) {
      await adicionarNoticias(dadosParaPlanilha, 'Globo');
      console.log(`✅ ${dadosParaPlanilha.length} notícia(s) adicionada(s) à aba "Globo".`);
    } else {
      console.log('Nenhuma notícia válida para adicionar.');
    }
  } catch (error) {
    console.error('Erro no fluxo do Valor Econômico:', error.message);
  }
}

// --- Função principal ---
async function main() {
  console.log('🚀 Iniciando o robô de notícias...'); // Adicionei um log inicial
  
  // 2. Configure as opções de inicialização
const launchOptions = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
  ],
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    '/usr/bin/google-chrome' // fallback para o buildpack novo
};

  // O Heroku buildpack define esta variável de ambiente com o caminho para o executável do Chrome
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  

(async () => {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  const page = await browser.newPage();
  await page.goto('https://example.com');
  console.log(await page.title());

  await browser.close();
})();
  
  try {
    await processarEstadao(browser);
    console.log('\n--- Coleta do Estadão finalizada ---');

    await processarTheNews(browser);
    console.log('\n--- Coleta do TheNews finalizada ---');

    await processarValor(browser);
    console.log('\n--- Coleta do Valor Econômico finalizada ---');
  } catch (error) {
    console.error('Erro inesperado:', error.message);
  } finally {
    await browser.close();
    console.log('\n✅ Navegador fechado.');
  }
}

// Executa a função principal
main();