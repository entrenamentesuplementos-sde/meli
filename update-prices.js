/**
 * Script de actualización automática de precios de Mercado Libre para EntrenaMente.
 * Extrae los precios y cuotas en tiempo real de los links de afiliado y actualiza index.html.
 */

const fs = require('fs');
const path = require('path');

const INDEX_PATH = path.join(__dirname, '..', 'index.html');

async function fetchProductInfo(meliUrl) {
  try {
    const res = await fetch(meliUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'es-AR,es;q=0.9'
      },
      redirect: 'follow'
    });
    const html = await res.text();

    let currentPrice = null;
    let previousPrice = null;
    let discount = null;
    let installments = null;
    let title = null;

    // Título
    const titleMatch = html.match(/<meta\s+name="title"\s+content="([^"]+)"/i) || html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
    if (titleMatch) {
      title = titleMatch[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    }

    // Precio actual
    const currentPriceMatch = html.match(/"current_price"\s*:\s*\{\s*"value"\s*:\s*([0-9\.]+)/);
    if (currentPriceMatch) {
      currentPrice = Number(currentPriceMatch[1]);
    }

    // Precio anterior
    const previousPriceMatch = html.match(/"previous_price"\s*:\s*\{\s*"value"\s*:\s*([0-9\.]+)/);
    if (previousPriceMatch) {
      previousPrice = Number(previousPriceMatch[1]);
    }

    // Descuento
    const discountMatch = html.match(/"discount_percentage"\s*:\s*"?([0-9]+)%?"?/i) || html.match(/(\d+)%\s*OFF/i);
    if (discountMatch) {
      discount = Number(discountMatch[1]);
    } else if (previousPrice && currentPrice && previousPrice > currentPrice) {
      discount = Math.round(((previousPrice - currentPrice) / previousPrice) * 100);
    }

    // Cuotas desde JSON
    const instObjMatch = html.match(/"installments"\s*:\s*\{"text"\s*:\s*"([^"]+)",(?:[^\}]+)"value"\s*:\s*([0-9\.]+)/);
    if (instObjMatch) {
      const template = instObjMatch[1];
      const val = Math.round(Number(instObjMatch[2]));
      const formattedVal = '$' + val.toLocaleString('es-AR');
      installments = template.replace('{price}', formattedVal);
    }

    // Fallback cuotas desde span
    if (!installments) {
      const polyInst = html.match(/<span[^>]*class="[^"]*poly-price__installments[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
      if (polyInst) {
        installments = polyInst[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      }
    }

    // Override específico si se requiere la variante Full para algún producto particular
    if (meliUrl === 'https://meli.la/1qBjZtH') {
      currentPrice = 33000;
      previousPrice = 69719;
      discount = 52;
      installments = '3 cuotas sin interés de $11.000';
    }

    return {
      url: meliUrl,
      title,
      currentPrice,
      previousPrice: (previousPrice && currentPrice && previousPrice > currentPrice) ? previousPrice : null,
      discount: (discount && previousPrice && previousPrice > currentPrice) ? discount : null,
      installments
    };
  } catch (err) {
    console.error(`Error al consultar ${meliUrl}:`, err.message);
    return null;
  }
}

function formatProductMap(products) {
  const map = {};
  const formatMoney = (n) => '$' + Math.round(n).toLocaleString('es-AR');

  for (const p of products) {
    if (!p || !p.currentPrice) continue;

    const currentPriceStr = formatMoney(p.currentPrice);
    const oldPriceStr = (p.previousPrice && p.previousPrice > p.currentPrice) ? formatMoney(p.previousPrice) : '';
    const discountStr = (p.discount && p.previousPrice > p.currentPrice) ? `${p.discount}% OFF` : '';

    let instStr = p.installments || '';
    if (instStr.includes('sin interés')) {
      // Mantener cuotas sin interés establecidas
    } else if (instStr.includes('Mismo precio 3 cuotas')) {
      const perCuota = formatMoney(p.currentPrice / 3);
      instStr = `3 cuotas sin interés de ${perCuota}`;
    } else if (instStr.includes('Mismo precio 6 cuotas')) {
      const perCuota = formatMoney(p.currentPrice / 6);
      instStr = `6 cuotas sin interés de ${perCuota}`;
    } else if (instStr.includes('Cuota promocionada en 6 cuotas de')) {
      const m = instStr.match(/\$[\d\.,]+/);
      instStr = `6 cuotas de ${m ? m[0] : formatMoney(p.currentPrice * 1.35 / 6)}`;
    } else if (instStr.includes('6 cuotas de')) {
      const m = instStr.match(/\$[\d\.,]+/);
      const num = m ? parseInt(m[0].replace(/[^\d]/g, '')) : 0;
      if (num > 0 && num < p.currentPrice) {
        instStr = `6 cuotas de ${m[0]}`;
      } else {
        const perCuota = formatMoney((p.currentPrice * 1.35) / 6);
        instStr = `6 cuotas de ${perCuota}`;
      }
    } else {
      const perCuota = formatMoney((p.currentPrice * 1.35) / 6);
      instStr = `6 cuotas de ${perCuota}`;
    }

    map[p.url] = {
      url: p.url,
      title: p.title,
      currentPrice: p.currentPrice,
      previousPrice: p.previousPrice,
      discount: p.discount,
      currentPriceStr,
      oldPriceStr,
      discountStr,
      instStr
    };
  }

  return map;
}

async function updateIndexHtml() {
  if (!fs.existsSync(INDEX_PATH)) {
    console.error('No se encontró index.html');
    process.exit(1);
  }

  let indexHtml = fs.readFileSync(INDEX_PATH, 'utf8');

  // Encontrar todos los enlaces de Mercado Libre únicos
  const meliRegex = /https:\/\/meli\.la\/[A-Za-z0-9]+/g;
  const uniqueUrls = [...new Set(indexHtml.match(meliRegex) || [])];

  console.log(`Encontrados ${uniqueUrls.length} enlaces de Mercado Libre en index.html`);

  const fetched = [];
  for (let i = 0; i < uniqueUrls.length; i++) {
    const url = uniqueUrls[i];
    console.log(`[${i + 1}/${uniqueUrls.length}] Consultando ${url}...`);
    const info = await fetchProductInfo(url);
    if (info) {
      fetched.push(info);
      console.log(`  ✓ ${info.title?.substring(0, 35)}... -> $${info.currentPrice}`);
    }
    // Pequeño retardo de cortesía
    await new Promise(r => setTimeout(r, 200));
  }

  const productMap = formatProductMap(fetched);

  // 1. Actualizar Tarjetas del Carrusel de Ofertas
  const offerCardRegex = /(<a\s+href="(https:\/\/meli\.la\/[A-Za-z0-9]+)"[^>]*class="offer-card">[\s\S]*?<\/a>)/gi;
  let offerCount = 0;

  indexHtml = indexHtml.replace(offerCardRegex, (fullMatch, cardContent, url) => {
    const data = productMap[url];
    if (!data) return fullMatch;

    let newCard = fullMatch;
    
    // Descuento
    if (data.discountStr) {
      if (newCard.includes('class="offer-discount"')) {
        newCard = newCard.replace(/<span class="offer-discount">[^<]*<\/span>/, `<span class="offer-discount">${data.discountStr}</span>`);
      } else {
        newCard = newCard.replace(/<div class="offer-card-img">/, `<div class="offer-card-img">\n            <span class="offer-discount">${data.discountStr}</span>`);
      }
    } else {
      newCard = newCard.replace(/\s*<span class="offer-discount">[^<]*<\/span>/, '');
    }
    
    // Precio
    let priceHtml = `<span class="offer-price">${data.currentPriceStr}</span>`;
    if (data.oldPriceStr) {
      priceHtml += `<span class="offer-price-old">${data.oldPriceStr}</span>`;
    }
    newCard = newCard.replace(/<span class="offer-price">[^<]*<\/span>(?:<span class="offer-price-old">[^<]*<\/span>)?/, priceHtml);

    // Cuotas
    newCard = newCard.replace(/<div class="offer-installments">[^<]*<\/div>/, `<div class="offer-installments">${data.instStr}</div>`);

    offerCount++;
    return newCard;
  });

  // 2. Actualizar Tarjetas del Catálogo y Secciones
  const productCardRegex = /(<article\s+class="product-card[^"]*"[\s\S]*?<\/article>)/gi;
  let catalogCount = 0;

  indexHtml = indexHtml.replace(productCardRegex, (fullMatch) => {
    const urlMatch = fullMatch.match(/href="(https:\/\/meli\.la\/[A-Za-z0-9]+)"/);
    if (!urlMatch) return fullMatch;
    const url = urlMatch[1];
    const data = productMap[url];
    if (!data) return fullMatch;

    let newCard = fullMatch;

    let priceWrapHtml = `            <div class="price-wrap">\n              <span class="price-current">${data.currentPriceStr}</span>`;
    if (data.oldPriceStr) {
      priceWrapHtml += `\n              <span class="price-old">${data.oldPriceStr}</span>`;
    }
    if (data.discountStr) {
      priceWrapHtml += `\n              <span class="price-discount">${data.discountStr}</span>`;
    }
    priceWrapHtml += `\n            </div>`;

    newCard = newCard.replace(/<div class="price-wrap">[\s\S]*?<\/div>/, priceWrapHtml);
    newCard = newCard.replace(/<div style="color: #00b864; font-size: 0.9rem; margin-top: -10px; margin-bottom: 15px; font-weight: 500;">[^<]*<\/div>/, `<div style="color: #00b864; font-size: 0.9rem; margin-top: -10px; margin-bottom: 15px; font-weight: 500;">${data.instStr}</div>`);

    catalogCount++;
    return newCard;
  });

  // Guardar archivo actualizado
  fs.writeFileSync(INDEX_PATH, indexHtml, 'utf8');
  console.log(`\n✅ Proceso completado exitosamente:`);
  console.log(`- ${offerCount} tarjetas de oferta actualizadas.`);
  console.log(`- ${catalogCount} tarjetas de catálogo actualizadas.`);
}

updateIndexHtml().catch(err => {
  console.error('Error fatal durante la actualización:', err);
  process.exit(1);
});
