// https://nuxt.com/docs/api/configuration/nuxt-config

const appScripts: any = [];
if (process.env.NODE_ENV === "production") {
  addClarity();
}

// for https://clarity.microsoft.com/
function addClarity() {
  appScripts.push({
    innerHTML: `(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${process.env.CLARITY}");`,
  });
}

export default defineNuxtConfig({
  ssr: false,
  imports: {
    autoImport: false,
  },
  devtools: {
    enabled: true,
  },
  app: {
    head: {
      title: "Earthworm",
      link: [{ rel: "icon", href: "/favicon.ico" }],
      script: appScripts,
    },
  },
  css: ["~/assets/css/globals.css"],
  modules: [
    "@nuxt/ui",
    "@vueuse/nuxt",
    "@nuxt/test-utils/module",
    "@hypernym/nuxt-anime",
    "@nuxt/image",
  ],
  plugins: ["~/plugins/http.ts"],
  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE || "",
      backendEndpoint: process.env.BACKEND_ENDPOINT || "",
      helpDocsURL: process.env.HELP_DOCS_URL || "",
    },
  },
  build: {
    transpile: ["vue-sonner"],
  },
  vite: {
    build: {
      sourcemap: false,
    },
    optimizeDeps: {
      include: [
        "vue",
        "vue-router",
        "pinia",
        "@vueuse/core",
        "lodash-es",
        "canvas-confetti",
        "vue-sonner",
        "dayjs",
        "fuse.js",
        "jszip",
        "satori",
      ],
      exclude: ["@iconify-json/ph", "@iconify-json/simple-icons"],
    },
  },
});
