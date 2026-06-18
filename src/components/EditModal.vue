<template>
    <!-- Edit / Add Channel Modal -->
    <div v-if="modal.edit || modal.add" class="modal-overlay" @mousedown.self="closeEditSafe"
         role="dialog" aria-modal="true" aria-labelledby="modal-edit-title">
      <div class="modal-card glass-s" v-if="editCh">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-xl font-bold" id="modal-edit-title">{{ modal.add ? t('addChannel_title') : t('editChannel') }}</h2>
          <button class="btn btn-ghost" style="padding:6px 10px" @click="closeEditSafe" :aria-label="t('close')" v-html="icon('x', 16)"></button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="label" for="edit-name">{{ t('channelName') }} *</label>
            <input id="edit-name" class="field" v-model="editCh.name" :placeholder="t('channelName')" aria-required="true" />
          </div>

          <div class="md:col-span-2">
            <label class="label" for="edit-url">{{ t('streamUrl') }} *</label>
            <input id="edit-url" class="field mono" v-model="editCh.url" placeholder="https:// or rtmp://…" aria-required="true" />
          </div>

          <div>
            <label class="label" for="edit-tvgid">{{ t('tvgId') }}</label>
            <input id="edit-tvgid" class="field" v-model="editCh.tvg_id" placeholder="tvg-id" />
          </div>
          <div>
            <label class="label" for="edit-tvgname">{{ t('tvgName') }}</label>
            <input id="edit-tvgname" class="field" v-model="editCh.tvg_name" placeholder="tvg-name" />
          </div>

          <div class="md:col-span-2">
            <label class="label" for="edit-logo">{{ t('tvgLogo') }}</label>
            <div class="flex gap-2 items-center">
              <input id="edit-logo" class="field" v-model="editCh.tvg_logo" placeholder="https://…" type="url" />
              <div class="ch-logo flex-shrink-0">
                <img v-if="editCh.tvg_logo" :src="editCh.tvg_logo" class="ch-logo" :alt="editCh.name || 'logo'" @error="$event.target.style.opacity='.2'" />
                <div v-else class="ch-logo logo-initials">{{ (editCh.name||'?').slice(0,2).toUpperCase() }}</div>
              </div>
            </div>
          </div>
          <div class="md:col-span-2">
            <label class="label" for="edit-tvgurl">{{ t('tvgUrl') }}</label>
            <input id="edit-tvgurl" class="field mono" v-model="editCh.tvg_url" placeholder="https://epg.example.com/epg.xml" type="url" />
          </div>
          <div>
            <label class="label" for="edit-country">{{ t('tvgCountry') }}</label>
            <input id="edit-country" class="field" v-model="editCh.tvg_country" placeholder="SK, CZ, EN…" />
          </div>

          <div>
            <label class="label" for="edit-group">{{ t('groupTitle') }}</label>
            <input id="edit-group" class="field" v-model="editCh.group_title" :placeholder="t('groupTitle')" />
          </div>
          <div>
            <label class="label" for="edit-quality">{{ t('qualityLabel') }}</label>
            <select id="edit-quality" class="select" v-model="editCh.quality">
              <option value="">{{ t('autoDetect') }}</option>
              <option value="4K">4K</option>
              <option value="FHD">FHD</option>
              <option value="HD">HD</option>
              <option value="SD">SD</option>
            </select>
          </div>

          <div class="md:col-span-2 flex items-center gap-3 pt-1">
            <button
              role="switch" :aria-checked="editCh.is_active.toString()"
              :aria-label="t('activeStatus')"
              class="btn btn-ghost"
              @click="editCh.is_active = !editCh.is_active"
              :style="{ color: editCh.is_active ? 'var(--success)' : 'var(--text3)' }"
            ><span class="inline-flex items-center gap-1"><span v-html="icon(editCh.is_active ? 'circle' : 'circleOff', 8)"></span>{{ editCh.is_active ? t('activeLabel') : t('offLabel') }}</span></button>
            <span class="text-sm" style="color:var(--text3)">{{ t('activeStatus') }}</span>
          </div>
        </div>

        <div class="flex gap-2 justify-end mt-5 pt-4" style="border-top:1px solid var(--sep)">
          <button class="btn btn-secondary" @click="closeEditSafe">{{ t('cancel') }}</button>
          <button class="btn btn-primary" @click="saveEdit" :disabled="!editCh.name || !editCh.url">{{ t('save') }}</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirm -->
</template>

<script setup>
defineProps(['show','isAdd','editCh','editIsDirty','t','icon'])
defineEmits(['close','save','closeSafe'])
</script>

