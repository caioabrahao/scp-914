import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'simulator',
      component: () => import('../views/SimulatorView.vue'),
    },
    {
      path: '/addendums',
      name: 'addendums',
      component: () => import('../views/AddendumArchiveView.vue'),
    },
  ],
})

export default router
