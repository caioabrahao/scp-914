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
const tier = ref<1 | 2 | 3>(1)
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
    error.value = 'Enter a prompt first.'
    return
  }

  response.value = ''
  denialReason.value = ''
  preamble.value = ''
  canonical.value = ''
  error.value = ''
  loading.value = true

  try {
    const result = await fetch('/api/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    tier.value = data.tier || 1
    preamble.value = data.preamble || ''
  } catch (caught) {
    error.value =
      caught instanceof Error ? caught.message : 'The AI request failed.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="app">
    <section class="panel" aria-labelledby="page-title">
      <header class="machine-header">
        <div>
          <p class="classification">SCP FOUNDATION // TEST INTERFACE</p>
          <h1 id="page-title">SCP-914</h1>
        </div>
        <span class="status">OFFLINE / TEST</span>
      </header>

      <form class="prompt-form" @submit.prevent="submitPrompt">
        <label for="input">Input object or description</label>
        <input
          id="input"
          v-model="input"
          type="text"
          placeholder="Describe an object or item..."
        />

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
            <span v-for="(setting, index) in settings" :key="setting">
              {{ setting }}
            </span>
          </div>
          <p class="selected-setting">
            Selected: <strong>{{ settings[settingIndex] }}</strong>
          </p>
        </fieldset>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Processing...' : 'Run SCP-914' }}
        </button>
      </form>

      <div v-if="error" class="error" role="alert">{{ error }}</div>

      <div v-if="denialReason" class="response denial" aria-live="polite">
        <div class="denial-header">
          <h2>Ethics / Records Form</h2>
          <span class="denied-stamp">DENIED</span>
        </div>
        <p class="denial-code">{{ denialReason }}</p>
        <div class="markdown" v-html="renderedResponse"></div>
      </div>

      <div v-else-if="response" class="response" aria-live="polite">
        <h2>Addendum — SCP-914 Processing Log</h2>
        <p v-if="canonical" class="entry-meta">
          Canonical: {{ canonical }} · Detail tier {{ tier }}
        </p>
        <p v-if="preamble" class="preamble">{{ preamble }}</p>
        <div class="markdown" v-html="renderedResponse"></div>
      </div>
    </section>
  </main>
</template>
