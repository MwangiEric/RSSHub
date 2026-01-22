import { Route } from '@/types';
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import { DataItem } from '@/types';

export const route: Route = {
    path: '/kenyatronics/product/:productId',
    categories: ['shopping'],
    example: '/kenyatronics/product/itel-s25-ultra-8gb-ram-256gb-rom',
    parameters: {
        productId: {
            description: 'Product ID or slug',
            required: true,
        },
    },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportRadar: true,
    },
    radar: [
        {
            source: ['kenyatronics.com/view-product/:productId'],
            target: '/kenyatronics/product/:productId',
        },
    ],
    name: 'Kenyatronics Product Details',
    maintainers: ['your-username'],
    handler: async (ctx) => {
        const productId = ctx.params.productId;
        const productUrl = `https://kenyatronics.com/view-product/${productId}`;
        
        try {
            const response = await got({
                method: 'get',
                url: productUrl,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            
            const $ = load(response.data);
            
            // Extract basic product information
            const title = $('.p_m_title').first().text().trim();
            const brand = $('.p_brand').text().replace('Product by', '').replace('Similar products by', '').trim();
            const priceText = $('.p_price').text().replace('Ksh.', '').replace(',', '').trim();
            const price = parseInt(priceText) || null;
            
            // Extract original price if available
            const originalPriceText = $('.strikethrough').first().text().replace('Ksh.', '').replace(',', '').trim();
            const originalPrice = originalPriceText ? parseInt(originalPriceText) : null;
            
            // Extract product images
            const images: any[] = [];
            $('.prodimages img').each((index, element) => {
                const imgUrl = $(element).attr('src');
                if (imgUrl && imgUrl.includes('getImage')) {
                    const match = imgUrl.match(/getImage\/([^\/]+)\//);
                    if (match && match[1]) {
                        const imgId = match[1];
                        images.push({
                            thumbnail: `https://kenyatronics.com/images/getImage/${imgId}/150`,
                            medium: `https://kenyatronics.com/images/getImage/${imgId}/300`,
                            large: `https://kenyatronics.com/images/getImage/${imgId}/500`,
                            original: `https://kenyatronics.com/images/getImage/${imgId}/800`
                        });
                    }
                }
            });
            
            // Extract specifications from the table
            const specifications: Record<string, string> = {};
            $('.product-table tr').each((index, element) => {
                const attributeName = $(element).find('.attribute-name').text().trim();
                const attributeValue = $(element).find('td:last').text().trim();
                if (attributeName && attributeValue) {
                    specifications[attributeName] = attributeValue;
                }
            });
            
            // Extract product description
            const description = $('.p_desc p').first().text().trim();
            
            // Extract warranty information
            const warranty = specifications['Warranty'] || '';
            
            // Extract key specifications for quick access
            const keySpecs = {
                display: specifications['Display Size'] || '',
                processor: specifications['Processor'] || '',
                ram: specifications['RAM'] || '',
                storage: specifications['Storage'] || '',
                camera: specifications['Camera Main Specs'] || '',
                battery: specifications['Battery Life'] || '',
                operatingSystem: specifications['Operating System'] || ''
            };
            
            const productData = {
                id: productId,
                title,
                brand,
                price,
                originalPrice,
                savings: originalPrice && price ? originalPrice - price : null,
                currency: 'KES',
                images,
                specifications,
                keySpecs,
                description,
                warranty,
                url: productUrl,
                fetchedAt: new Date().toISOString()
            };
            
            // Return as RSSHub item
            return {
                title: productData.title,
                description: productData.description,
                link: productData.url,
                guid: productData.url,
                pubDate: parseDate(productData.fetchedAt),
                category: [brand, 'electronics', 'mobile-phones'],
                author: brand,
                content: {
                    html: `
                        <h2>${productData.title}</h2>
                        <p><strong>Price:</strong> KES ${productData.price?.toLocaleString()}</p>
                        ${productData.originalPrice ? `<p><strong>Original Price:</strong> KES ${productData.originalPrice.toLocaleString()}</p>` : ''}
                        ${productData.savings ? `<p><strong>Savings:</strong> KES ${productData.savings.toLocaleString()}</p>` : ''}
                        <p><strong>Brand:</strong> ${productData.brand}</p>
                        <p><strong>Warranty:</strong> ${productData.warranty}</p>
                        <h3>Key Specifications</h3>
                        <ul>
                            ${Object.entries(productData.keySpecs).filter(([_, v]) => v).map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`).join('')}
                        </ul>
                        <h3>Images</h3>
                        ${productData.images.map(img => `<img src="${img.large}" alt="${productData.title}" style="max-width: 300px; margin: 10px;" />`).join('')}
                        <h3>Full Specifications</h3>
                        <table border="1" style="border-collapse: collapse; width: 100%;">
                            ${Object.entries(productData.specifications).map(([k, v]) => `<tr><td style="padding: 8px;"><strong>${k}</strong></td><td style="padding: 8px;">${v}</td></tr>`).join('')}
                        </table>
                    `,
                    text: JSON.stringify(productData, null, 2),
                },
            };
        } catch (error) {
            console.error('Error fetching Kenyatronics product:', error);
            throw new Error(`Failed to fetch product: ${error.message}`);
        }
    },
};
