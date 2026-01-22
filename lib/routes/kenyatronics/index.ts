import { Route } from '@/types';
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import { DataItem } from '@/types';

export const route: Route = {
    path: '/kenyatronics',
    categories: ['shopping'],
    example: '/kenyatronics/search/samsung',
    parameters: {
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
            source: ['kenyatronics.com/'],
            target: '/kenyatronics',
        },
    ],
    name: 'Kenyatronics',
    maintainers: ['your-username'],
    handler,
};

async function handler(ctx: any): Promise<DataItem | DataItem[]> {
    const path = ctx.req.path;
    
    // Handle different route patterns
    if (path.includes('/product/')) {
        return await handleProductRequest(ctx);
    } else if (path.includes('/search/')) {
        return await handleSearchRequest(ctx);
    }
    
    // Default response
    return {
        title: 'Kenyatronics RSSHub',
        link: 'https://kenyatronics.com',
        description: 'Kenyatronics electronics store RSS feed',
        item: [],
    };
}

async function handleProductRequest(ctx: any): Promise<DataItem> {
    const productId = ctx.params.productId || ctx.params.id;
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
        
        // Extract similar products
        const similarProducts: any[] = [];
        $('#owl-demo-similar .product_wrapper').each((index, element) => {
            const productTitle = $(element).find('.p_m_title').text().trim();
            const productUrl = $(element).find('a').first().attr('href');
            const productPrice = $(element).find('.p_price').text().replace('Ksh.', '').replace(',', '').trim();
            const productImg = $(element).find('img').attr('src');
            
            if (productTitle && productUrl) {
                similarProducts.push({
                    title: productTitle,
                    url: `https://kenyatronics.com${productUrl}`,
                    price: productPrice ? parseInt(productPrice) : null,
                    image: productImg
                });
            }
        });
        
        // Extract structured data from JSON-LD if available
        let structuredData: any = {};
        try {
            const jsonLdScript = $('script[type="application/ld+json"]').html();
            if (jsonLdScript) {
                structuredData = JSON.parse(jsonLdScript || '{}');
            }
        } catch (e) {
            console.error('Error parsing JSON-LD:', e);
        }
        
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
            similarProducts,
            url: productUrl,
            structuredData,
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
                    <h3>Similar Products</h3>
                    <ul>
                        ${productData.similarProducts.map(p => `<li><a href="${p.url}">${p.title}</a> - KES ${p.price?.toLocaleString()}</li>`).join('')}
                    </ul>
                `,
                text: JSON.stringify(productData, null, 2),
            },
        };
    } catch (error) {
        console.error('Error fetching Kenyatronics product:', error);
        throw new Error(`Failed to fetch product: ${error.message}`);
    }
}

async function handleSearchRequest(ctx: any): Promise<DataItem[]> {
    const keyword = ctx.params.keyword || ctx.params.id;
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
        throw new Error(`Failed to search products: ${error.message}`);
    }
}
