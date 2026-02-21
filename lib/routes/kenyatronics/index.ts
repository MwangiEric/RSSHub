import { Route } from '@/types';
import { DataItem } from '@/types';

export const route: Route = {
    path: '/kenyatronics/search/:keyword',
    categories: ['shopping'],
    example: '/kenyatronics/search/samsung',
    name: 'Kenyatronics Search',
    maintainers: ['your-username'],
    handler: async (ctx) => {
        console.log('Search route hit for keyword:', ctx.params.keyword); // Debug log

        return [{
            title: `Search results for: ${ctx.params.keyword}`,
            description: 'Test description',
            link: 'https://kenyatronics.com',
            guid: 'test-guid',
            pubDate: new Date(),
        }];
    },
};