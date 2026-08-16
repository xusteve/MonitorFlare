import { createRouter, createWebHistory } from 'vue-router';

const routes = [
    {
        path: '/',
        name: 'Status',
        component: () => import('../views/StatusPage.vue'),
    },
    {
        path: '/magic',
        name: 'MagicLink',
        component: () => import('../components/admin/MagicLinkHandler.vue'),
    },
    {
        path: '/admin',
        name: 'Admin',
        component: () => import('../views/AdminPage.vue'),
    },
    {
        path: '/deploy',
        name: 'Deploy',
        component: () => import('../views/DeployPage.vue'),
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
