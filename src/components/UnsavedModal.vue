<template>
    <div v-if="modal.unsaved" class="modal-overlay" style="z-index:70"
         role="alertdialog" aria-modal="true" aria-labelledby="unsaved-title">
      <div class="modal-card glass-s" style="max-width:380px">
        <h2 class="text-xl font-bold mb-2" id="unsaved-title">{{ t('unsavedTitle') }}</h2>
        <p class="text-sm mb-5" style="color:var(--text3)">{{ t('unsavedDesc') }}</p>
        <div class="flex gap-2 justify-end">
          <button class="btn btn-secondary" @click="modal.unsaved = false">{{ t('keepEditing') }}</button>
          <button class="btn btn-danger"    @click="forceCloseEdit">{{ t('discardChanges') }}</button>
        </div>
      </div>
    </div>

</template>

<script setup>
defineProps(['show','t'])
defineEmits(['keepEditing','discard'])
</script>

