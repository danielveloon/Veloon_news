require('dotenv').config();
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

// --- Função para processar notícias do Estadão ---
async function processarEstadao(browser) {
  console.log('🔍 Coletando notícias do Estadão (somente de hoje)');
  const noticiasComConteudo = [];

  try {
    const noticiasEstadao = await coletarNoticiasEstadao('https://www.estadao.com.br/ultimas/', browser);

    for (const noticia of noticiasEstadao) {
      console.log(`\n📰 Título: ${noticia.titulo}`);
      console.log(`🔗 Link: ${noticia.link}`);

      const resultado = await pegarConteudoNoticia(noticia.link, noticia.titulo, browser);
      const conteudoFinal = resultado.texto.length > 0 ? resultado.texto : 'Conteúdo não disponível';

      noticiasComConteudo.push({
        titulo: noticia.titulo,
        link: noticia.link,
        conteudo: conteudoFinal
      });
    }

    if (noticiasComConteudo.length > 0) {
      // Verifique o nome da aba no Google Sheets!
      await adicionarNoticias(noticiasComConteudo, 'Estadão');
    }
  } catch (error) {
    console.error('Erro no fluxo do Estadão:', error);
  }
}

// --- Função para processar notícias do TheNews ---
async function processarTheNews(browser) {
  console.log('\n🔍 Coletando notícias do TheNews (somente de hoje)');
  try {
    const noticiasTheNews = await coletarNoticiasTheNews('https://thenewscc.beehiiv.com/', browser);
    if (noticiasTheNews.length > 0) {
      await adicionarNoticias(noticiasTheNews, 'TheNews');
    }
  } catch (error) {
    console.error('Erro no fluxo do TheNews:', error);
  }
}

// --- Função para processar notícias do Valor Econômico ---
async function processarValor(browser) {
  console.log('\n🔍 Coletando notícias do Valor Econômico (somente de hoje)');
  const noticiasComConteudo = [];
  const linksAdicionados = new Set();

  try {
    const noticiasValor = await coletarNoticiasValor('https://valor.globo.com/ultimas-noticias/', browser);

    for (const noticia of noticiasValor) {
      if (linksAdicionados.has(noticia.link)) continue;
      linksAdicionados.add(noticia.link);

      const resultado = await pegarConteudoNoticiaValor(noticia.link, noticia.titulo, browser);
      if (!resultado.texto || resultado.texto.trim().length === 0) continue;

      noticiasComConteudo.push({
        titulo: noticia.titulo,
        link: noticia.link,
        conteudo: resultado.texto
      });
    }

    if (noticiasComConteudo.length > 0) {
      await adicionarNoticias(noticiasComConteudo, 'Globo');
    }
  } catch (error) {
    console.error('Erro no fluxo do Valor Econômico:', error);
  }
}

// --- Função principal ---
async function main() {
  console.log('🚀 Iniciando o robô de notícias...');
  let browser;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    await processarEstadao(browser);
    await processarTheNews(browser);
    await processarValor(browser);

  } catch (error) {
    console.error('Erro inesperado:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n✅ Navegador fechado.');
    }
  }
}

main();
