<script setup lang="ts">
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { computed, ref } from 'vue'

const settings = ['Rough', 'Coarse', '1:1', 'Fine', 'Very Fine'] as const

const input = ref('')
const settingIndex = ref(2)
const response = ref('')
const error = ref('')
const loading = ref(false)
const renderedResponse = computed(() => {
  if (!response.value) return ''
  return DOMPurify.sanitize(marked.parse(response.value, { async: false }))
})

async function submitPrompt() {
  const text = input.value.trim()

  if (!text) {
    response.value = ''
    error.value = 'Enter a prompt first.'
    return
  }

  response.value = ''
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

    const data = await result.json() as { response?: string; error?: string }

    if (!result.ok) {
      throw new Error(data.error || 'The AI request failed.')
    }

    response.value = data.response || ''
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

      <div v-if="response" class="response" aria-live="polite">
        <h2>Addendum — SCP-914 Processing Log</h2>
        <div class="markdown" v-html="renderedResponse"></div>
      </div>
    </section>
  </main>
</template>
