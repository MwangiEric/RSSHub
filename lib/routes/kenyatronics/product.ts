import { Route } from '@/types';
import { DataItem } from '@/types';

export const route: Route = {
    path: '/kenyatronics/product/:productId',
    categories: ['shopping'],
    example: '/kenyatronics/product/test',
    name: 'Kenyatronics Product',
    maintainers: ['your-username'],
    handler: async (ctx) => {
        console.log('Product route hit for ID:', ctx.params.productId); // Debug log
        
        return {
            title: `Product details for: ${ctx.params.productId}`,
            description: 'Test description',
            link: 'https://kenyatronics.com',
            guid: 'test-guid',
            pubDate: new Date(),
        };
    },
};
