export default (router) => {
    router.get('/', './index');
    router.get('/search/:keyword', './index');
    router.get('/product/:productId', './index');
};
