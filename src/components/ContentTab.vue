<template>
          <div class="glass rounded-[24px] p-4 md:p-5">
            <div class="sec-label">{{ t('tabContent') }}</div>
            <h2 class="text-[1.3rem] font-bold tracking-[-0.03em] mb-4">{{ t('contentHeading') }}</h2>

            <!-- Quality stat cards -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div class="stat-card">
                <div class="num" style="color:var(--purple)">{{ stats.qualities['4K'] }}</div>
                <div class="lbl">4K</div>
              </div>
              <div class="stat-card">
                <div class="num" style="color:var(--primary)">{{ stats.qualities['FHD'] }}</div>
                <div class="lbl">FHD</div>
              </div>
              <div class="stat-card">
                <div class="num" style="color:var(--success)">{{ stats.qualities['HD'] }}</div>
                <div class="lbl">HD</div>
              </div>
              <div class="stat-card">
                <div class="num" style="color:var(--gray)">{{ stats.qualities['SD'] }}</div>
                <div class="lbl">SD</div>
              </div>
            </div>

            <!-- Groups list -->
            <div class="sec-label mb-2">{{ t('groupsOverview') }}</div>
            <div v-if="groupList.length" class="space-y-1" role="list">
              <div class="group-item" v-for="[g, count] in groupList" :key="g || '__nogroup__'" role="listitem">
                <span class="font-medium text-sm">{{ g || '—' }}</span>
                <div class="flex items-center gap-2">
                  <span class="stat-pill"><strong>{{ count }}</strong></span>
                  <button
                    class="btn btn-ghost" style="padding:4px 10px"
                    @click="filters.group = g; activeTab = 'library'"
                    :aria-label="t('filterByGroup') + ': ' + (g || t('noGroup'))"
                    v-html="icon('arrowUR', 14)"></button>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <div class="icon" aria-hidden="true" v-html="icon('barChart', 44)"></div>
              <h3>{{ t('noGroups') }}</h3>
              <p>{{ t('noGroupsDesc') }}</p>
            </div>
          </div>
        </section>

        <!-- ══ DESIGN TAB ══ -->
</template>

<script setup>
defineProps(['stats','groupList','t','icon'])
defineEmits(['filterByGroup'])
</script>

