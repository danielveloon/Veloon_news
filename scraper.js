// scraper.js unificado

// Função auxiliar para esperar
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Função auxiliar para pegar a data de hoje no formato YYYY-MM-DD
function dataHoje() {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    return `${ano}-${mes}-${dia}`;
}

// ----------------------------------------------------
// Funções do SCRAPER para VALOR ECONÔMICO
// ----------------------------------------------------
async function coletarNoticiasValor(url, browser) {
  if (!browser) throw new Error('Parâmetro browser não foi informado!');

  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Espera por qualquer item do feed de notícias
    await page.waitForSelector('div.feed-post', { timeout: 20000 });

    // Extrai as notícias de todos os elementos com a classe .feed-post
    const noticias = await page.$$eval('div.feed-post', divs => {
      const noticiasMap = new Map();

      divs.forEach(divPost => {
        // Encontra o link e o título dentro do feed-post
        const a = divPost.querySelector('h2.feed-post-link a.feed-post-link');
        const link = a ? a.href.trim() : null;
        const titulo = a ? a.innerText.trim() : null;

        if (link && titulo && !noticiasMap.has(link)) {
          noticiasMap.set(link, { titulo, link });
        }
      });

      return Array.from(noticiasMap.values());
    });

    await page.close();
    return noticias || [];
  } catch (error) {
    console.error('Erro ao coletar notícias do Valor:', error.message);
    await page.close();
    return [];
  }
}

async function pegarConteudoNoticiaValor(url, titulo, browser) {
    if (!browser) throw new Error('Parâmetro browser não foi informado!');

    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        await page.waitForSelector('div.no-paywall', { timeout: 30000 });

        const dados = await page.evaluate(() => {
            const noPaywallDiv = document.querySelector('div.no-paywall');
            if (!noPaywallDiv) return null;

            const paragrafos = Array.from(noPaywallDiv.querySelectorAll('p'))
                .map(p => p.innerText.trim())
                .filter(texto => texto.length > 0);

            if (paragrafos.length === 0) return null;

            return { texto: paragrafos.join('\n\n') };
        });

        await page.close();

        if (!dados || !dados.texto) {
            return { texto: '', titulo: '' };
        }

        return { texto: dados.texto, titulo };
    } catch (error) {
        console.error(`Erro ao pegar conteúdo da notícia em ${url}:`, error.message);
        await page.close();
        return { texto: '', titulo: '' };
    }
}

// ----------------------------------------------------
// Funções do SCRAPER para ESTADÃO
// ----------------------------------------------------
async function coletarNoticiasEstadao(url, browser) {
    if (!browser) throw new Error('Parâmetro browser não foi informado!');

    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForSelector('.container-initial-collection', { timeout: 20000 });

        const agora = new Date();
        const seisHorasAtras = new Date(agora.getTime() - 6 * 60 * 60 * 1000); // 6 horas atrás

        const noticias = await page.$$eval(
            '.container-initial-collection .noticias-mais-recenter--item',
            (items, seisHorasAtrasStr) => {
                return items.map(item => {
                    const linkEl = item.querySelector('a[href]');
                    const tituloEl = item.querySelector('h3.headline');
                    const dataEl = item.querySelector('.info .date');

                    if (!linkEl || !tituloEl || !dataEl) return null;

                    // Extrai data e hora
                    const dataHoraTexto = dataEl.textContent.trim(); // exemplo: "15/08/2025 14:30"
                    const [dataStr, horaStr] = dataHoraTexto.split(' '); 
                    const [dia, mes, ano] = dataStr.split('/').map(Number);
                    const [hora, minuto] = horaStr.split(':').map(Number);
                    const dataNoticia = new Date(ano, mes - 1, dia, hora, minuto);

                    // Filtra só as notícias das últimas 6 horas
                    if (dataNoticia < new Date(seisHorasAtrasStr)) return null;

                    return {
                        titulo: tituloEl.innerText.trim(),
                        link: linkEl.href
                    };
                }).filter(Boolean);
            },
            seisHorasAtras.toISOString()
        );

        await page.close();
        return noticias;
    } catch (error) {
        console.error('Erro ao coletar notícias do Estadão:', error.message);
        await page.close();
        return [];
    }
}


async function pegarConteudoNoticia(url, titulo, browser) {
    if (!browser) throw new Error('Parâmetro browser não foi informado!');

    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        const seletorParagraph = 'p[data-component-name="paragraph"]';
        await page.waitForSelector(seletorParagraph, { timeout: 60000 });

        const paragrafos = await page.$$eval(
            seletorParagraph,
            elementos => elementos.map(el => el.innerText.trim()).filter(t => t.length > 0)
        );

        await sleep(5000);
        await page.close();

        return {
            texto: paragrafos.join('\n\n'),
            requisicoesRelacionadas: []
        };
    } catch (error) {
        console.error(`Erro ao pegar conteúdo da notícia em ${url}:`, error.message);
        await page.close();
        return { texto: '', requisicoesRelacionadas: [] };
    }
}

// ----------------------------------------------------
// Funções do SCRAPER para THENEWS
// ----------------------------------------------------
async function coletarNoticiasTheNews(url, browser) {
    if (!browser) throw new Error('Parâmetro browser não foi informado!');

    const page = await browser.newPage();
    const hojeStr = dataHoje().split('-').reverse().join('/'); // formato: dd/mm/yyyy

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        const noticias = await page.$$eval('div.relative.w-full', (divs, hojeStr) => {
            const baseUrl = 'https://thenewscc.beehiiv.com';

            return divs.map(div => {
                const img = div.querySelector('img[alt]');
                const linkEl = div.querySelector('a[href]');
                if (!img || !linkEl) return null;

                const dataTexto = img.getAttribute('alt')?.trim();
                const href = linkEl.getAttribute('href');

                if (!dataTexto || !href || dataTexto !== hojeStr) return null;

                return {
                    titulo: `TheNews - ${dataTexto}`,
                    resumo: '',
                    tempo: 'hoje',
                    dataAttr: hojeStr.split('/').reverse().join('-'),
                    link: `${baseUrl}${href}`,
                };
            }).filter(Boolean);
        }, hojeStr);

        for (const noticia of noticias) {
            const noticiaPage = await browser.newPage();
            try {
                await noticiaPage.goto(noticia.link, { waitUntil: 'networkidle2', timeout: 60000 });

                await noticiaPage.waitForSelector('p, li', { timeout: 10000 });

                let conteudo = await noticiaPage.evaluate(() =>
                    Array.from(document.querySelectorAll('p, li'))
                        .map(el => el.innerText.trim())
                        .filter(Boolean)
                        .join('\n')
                );

                conteudo = conteudo.replace(/\n{2,}/g, '\n').trim();
                noticia.conteudo = conteudo;
            } catch {
                noticia.conteudo = null;
            } finally {
                await noticiaPage.close();
            }
        }

        await page.close();
        return noticias;
    } catch (error) {
        console.error('Erro ao coletar notícias TheNews:', error.message);
        await page.close();
        return [];
    }
}

// ----------------------------------------------------
// Exportando todas as funções
// ----------------------------------------------------
module.exports = {
    coletarNoticiasValor,
    pegarConteudoNoticiaValor,
    coletarNoticiasEstadao,
    pegarConteudoNoticia,
    coletarNoticiasTheNews
};