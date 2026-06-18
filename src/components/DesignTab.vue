<template>
          <div class="sec-label">{{ t('tabDesign') }}</div>
          <h2 class="text-[1.3rem] font-bold tracking-[-0.03em] mb-5">{{ t('designHeading') }}</h2>

          <!-- Language -->
          <div class="sec-label mb-2">{{ t('langLabel') }}</div>
          <div class="design-row">
            <span class="text-sm" style="color:var(--text3)">{{ t('language') }}</span>
            <div class="lang-sw" role="group" :aria-label="t('langLabel')">
              <span style="padding:2px 4px 2px 6px; opacity:.55; display:inline-flex; align-items:center" aria-hidden="true" v-html="icon('globe', 14)"></span>
              <button :class="{ active: lang === 'sk' }" @click="setLang('sk')" aria-label="Slovenčina" :aria-pressed="(lang === 'sk').toString()">SK</button>
              <button :class="{ active: lang === 'en' }" @click="setLang('en')" aria-label="English" :aria-pressed="(lang === 'en').toString()">EN</button>
            </div>
          </div>

          <!-- Theme -->
          <div class="sec-label mb-2 mt-4">{{ t('theme') }}</div>
          <div class="design-row">
            <span class="text-sm" style="color:var(--text3)">{{ t('theme') }}</span>
            <button class="btn btn-ghost" @click="toggleTheme" :aria-label="theme === 'dark' ? t('switchLight') : t('switchDark')">
              <span v-if="theme === 'dark'" class="inline-flex items-center gap-1.5"><span v-html="icon('sun', 15)"></span>{{ t('light') }}</span>
              <span v-else class="inline-flex items-center gap-1.5"><span v-html="icon('moon', 15)"></span>{{ t('dark') }}</span>
            </button>
          </div>

          <!-- About -->
          <div class="mt-5 p-4 rounded-[var(--radius-md)]" style="background:var(--fill);border:1px solid var(--border)">
            <p class="text-sm" style="color:var(--text3)">{{ t('designInfoDesc') }}</p>
          </div>
        </section>

      </main>
    </div><!-- /grid -->

    <!-- ══════════════════════ MODALS ══════════════════════ -->

</template>

<script setup>
defineProps(['theme','lang','t','icon'])
defineEmits(['toggleTheme','setLang'])
</script>

