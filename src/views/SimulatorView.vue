<script setup lang="ts">
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { computed, ref } from 'vue'

const settings = ['Rough', 'Coarse', '1:1', 'Fine', 'Very Fine'] as const

const input = ref('')
const settingIndex = ref(2)
const response = ref('')
const denialReason = ref('')
const preamble = ref('')
const canonical = ref('')
const firstExperimentedAt = ref<number | null>(null)
const documentNumber = ref<number | null>(null)
const error = ref('')
const loading = ref(false)

const renderedResponse = computed(() => {
  if (!response.value) return ''
  const redacted = response.value.replace(
    /⟦([^⟧]+)⟧/g,
    (_match, text: string) =>
      `<span class="redaction" role="img" aria-label="redacted">${'█'.repeat(text.trim().length)}</span>`,
  )
  return DOMPurify.sanitize(marked.parse(redacted, { async: false }))
})

async function submitPrompt() {
  const text = input.value.trim()

  if (!text) {
    response.value = ''
    denialReason.value = ''
    preamble.value = ''
    canonical.value = ''
    firstExperimentedAt.value = null
    documentNumber.value = null
    documentNumber.value = null
    error.value = 'Enter a prompt first.'
    return
  }

  response.value = ''
  denialReason.value = ''
  preamble.value = ''
  canonical.value = ''
  firstExperimentedAt.value = null
  error.value = ''
  loading.value = true

  try {
    const result = await fetch('/api/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: text,
        setting: settings[settingIndex.value],
      }),
    })

    const data = await result.json() as {
      kind?: 'entry' | 'denial'
      response?: string
      body?: string
      canonical?: string
      tier?: 1 | 2 | 3
      preamble?: string
      reason?: string
      text?: string
      error?: string
      firstExperimentedAt?: number
      documentNumber?: number
    }

    if (data.kind === 'denial') {
      denialReason.value = data.reason || 'invalid'
      response.value = data.text || ''
      return
    }

    if (!result.ok) {
      throw new Error(data.error || 'The AI request failed.')
    }

    response.value = data.body || data.response || ''
    canonical.value = data.canonical || ''
    preamble.value = data.preamble || ''
    firstExperimentedAt.value = data.firstExperimentedAt ?? null
    documentNumber.value = data.documentNumber ?? null
  } catch (caught) {
    error.value =
      caught instanceof Error ? caught.message : 'The AI request failed.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="testing-layout">
    <section class="testing-controls" aria-labelledby="page-title">
      <header class="testing-header">
        <p class="classification">SCP FOUNDATION // TEST INTERFACE</p>
        <h1 id="page-title">SCP-914</h1>
      </header>

      <form class="prompt-form" @submit.prevent="submitPrompt">
        <label for="input">Input object or description</label>
        <textarea
          id="input"
          v-model="input"
          rows="8"
          placeholder="Describe an object or item..."
        ></textarea>

        <fieldset class="dial">
          <legend>Output setting</legend>
          <input
            v-model.number="settingIndex"
            type="range"
            min="0"
            max="4"
            step="1"
            aria-label="SCP-914 output setting"
          />
          <div class="dial-labels" aria-hidden="true">
            <span v-for="setting in settings" :key="setting">{{ setting }}</span>
          </div>
          <p class="selected-setting">
            Selected: <strong>{{ settings[settingIndex] }}</strong>
          </p>
        </fieldset>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Processing...' : 'Run SCP-914' }}
        </button>
      </form>
    </section>

    <section class="document-pane" aria-label="Test result">
      <div v-if="loading" class="document-state">Processing test record...</div>
      <div v-else-if="error" class="error document-error" role="alert">{{ error }}</div>

      <article v-else-if="denialReason" class="document denial" aria-live="polite">
        <div class="denial-header">
          <h2>Ethics / Records Form</h2>
          <span class="denied-stamp">DENIED</span>
        </div>
        <p class="denial-code">{{ denialReason }}</p>
        <div class="markdown" v-html="renderedResponse"></div>
      </article>

      <article v-else-if="response" class="document" aria-live="polite">
        <header class="document-header">
          <p class="document-type">SCP-914 PROCESSING RECORD</p>
          <h2 v-if="documentNumber">
            Document 914/{{ String(documentNumber).padStart(3, '0') }} - Experiment Log
          </h2>
          <p v-if="firstExperimentedAt" class="entry-meta">
            First experimented:
            {{ new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(firstExperimentedAt) }}
          </p>
        </header>
        <p v-if="preamble" class="preamble">{{ preamble }}</p>
        <div class="markdown" v-html="renderedResponse"></div>
      </article>

      <div v-else class="document-state">
        Enter an item and run SCP-914 to produce a test document.
      </div>
    </section>
  </main>
</template>
