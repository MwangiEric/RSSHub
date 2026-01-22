import { Route } from '@/types';
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import { DataItem } from '@/types';

export const route: Route = {
    path: '/kenyatronics/search/:keyword',
    categories: ['shopping'],
    example: '/kenyatronics/search/samsung',
    parameters: {
        keyword: {
            description: 'Search keyword',
            required: true,
        },
        category: {
            description: 'Product category',
            default: 'mobile-phones',
            optional: true,
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
            source: ['kenyatronics.com/search'],
            target: '/kenyatronics/search',
        },
    ],
    name: 'Kenyatronics Search',
    maintainers: ['your-username'],
    handler: async (ctx) => {
        const keyword = ctx.params.keyword;
        const category = ctx.query.category || 'mobile-phones';
        
        try {
            const searchUrl = `https://kenyatronics.com/search?keywords=${encodeURIComponent(keyword)}&category=${category}`;
            
            const response = await got({
                method: 'get',
                url: searchUrl,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            
            const $ = load(response.data);
            const items: DataItem[] = [];
            
            // Extract product information from the search results
            $('.item_parent_result').each((index, element) => {
                const item = $(element);
                
                // Extract product details
                const title = item.find('.p_m_title').text().trim();
                const brand = item.find('.p_brand').text().trim();
                const price = item.find('.p_price').text().replace('Ksh.', '').replace(',', '').trim();
                const originalPrice = item.find('.strikethrough').text().replace('Ksh.', '').replace(',', '').trim();
                const imageUrl = item.find('img').attr('src');
                const productUrl = item.find('a').first().attr('href');
                
                // Skip if essential data is missing
                if (!title || !price || !productUrl) return;
                
                // Extract product ID from URL
                const productId = productUrl.replace('/view-product/', '');
                
                const priceNum = parseInt(price) || 0;
                const originalPriceNum = originalPrice ? parseInt(originalPrice) : null;
                
                items.push({
                    title: `${title} - KES ${priceNum.toLocaleString()}`,
                    description: `${brand} - ${title}`,
                    link: `https://kenyatronics.com${productUrl}`,
                    guid: `https://kenyatronics.com${productUrl}`,
                    pubDate: parseDate(new Date().toISOString()),
                    category: [brand, 'electronics', category],
                    author: brand,
                    content: {
                        html: `
                            <h3>${title}</h3>
                            <p><strong>Brand:</strong> ${brand}</p>
                            <p><strong>Price:</strong> KES ${priceNum.toLocaleString()}</p>
                            ${originalPriceNum ? `<p><strong>Original Price:</strong> KES ${originalPriceNum.toLocaleString()}</p>` : ''}
                            ${originalPriceNum ? `<p><strong>Savings:</strong> KES ${(originalPriceNum - priceNum).toLocaleString()}</p>` : ''}
                            ${imageUrl ? `<img src="https://kenyatronics.com${imageUrl}" alt="${title}" style="max-width: 200px;" />` : ''}
                            <p><a href="https://myrhub.vercel.app/kenyatronics/product/${productId}">View Full Details</a></p>
                        `,
                        text: `${title} - KES ${priceNum} - ${brand}`,
                    },
                });
            });
            
            return items;
        } catch (error) {
            console.error('Error searching Kenyatronics:', error);
            return [];
        }
    },
};
