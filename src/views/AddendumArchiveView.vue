<script setup lang="ts">
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { computed, onMounted, ref } from 'vue'

type EntryResponse = {
  kind: 'entry'
  canonical: string
  setting: string
  tier: 1 | 2 | 3
  preamble?: string
  body: string
  cached: boolean
  firstExperimentedAt: number
  documentNumber: number
  inputCount: number
}

type ArchiveItem = {
  id: string
  canonical: string
  setting: string
  tier: 1 | 2 | 3
  preamble?: string
  cachedAt: number
  firstExperimentedAt: number
  documentNumber: number
  inputCount: number
}

const items = ref<ArchiveItem[]>([])
const selected = ref<EntryResponse | null>(null)
const loading = ref(true)
const detailLoading = ref(false)
const error = ref('')
const searchQuery = ref('')

const filteredItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return items.value
  return items.value.filter((item) =>
    [
      item.canonical,
      item.setting,
      item.preamble || '',
    ].some((value) => value.toLowerCase().includes(query)),
  )
})

const renderedBody = computed(() => {
  if (!selected.value) return ''
  const redacted = selected.value.body.replace(
    /⟦([^⟧]+)⟧/g,
    (_match, text: string) =>
      `<span class="redaction" role="img" aria-label="redacted">${'█'.repeat(text.trim().length)}</span>`,
  )
  return DOMPurify.sanitize(marked.parse(redacted, { async: false }))
})

async function loadArchive() {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch('/api/addendums')
    const data = await response.json() as { items?: ArchiveItem[]; error?: string }
    if (!response.ok) throw new Error(data.error || 'Unable to load addendums.')
    items.value = data.items || []
  } catch (caught) {
    error.value =
      caught instanceof Error ? caught.message : 'Unable to load addendums.'
  } finally {
    loading.value = false
  }
}

async function openAddendum(id: string) {
  detailLoading.value = true
  error.value = ''
  try {
    const response = await fetch(`/api/addendums/${encodeURIComponent(id)}`)
    const data = await response.json() as EntryResponse & { error?: string }
    if (!response.ok) throw new Error(data.error || 'Unable to load addendum.')
    selected.value = data
  } catch (caught) {
    error.value =
      caught instanceof Error ? caught.message : 'Unable to load addendum.'
  } finally {
    detailLoading.value = false
  }
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp)
}

function formatDocumentNumber(number: number) {
  return `Document 914/${String(number).padStart(3, '0')} - Experiment Log`
}

onMounted(loadArchive)
</script>

<template>
  <main class="app archive-app">
    <section class="archive-layout" aria-labelledby="archive-title">
      <header class="archive-header">
        <div>
          <p class="classification">SCP FOUNDATION // RECORDS OFFICE</p>
          <h1 id="archive-title">Addendum archive</h1>
        </div>
        <button type="button" class="secondary-button" @click="loadArchive">
          Refresh
        </button>
      </header>

      <div v-if="loading" class="archive-status">Loading records...</div>
      <div v-else-if="error" class="error" role="alert">{{ error }}</div>
      <div v-else class="archive-grid">
        <aside class="archive-sidebar" aria-label="Saved addendums">
          <label class="archive-search">
            <span>Search records</span>
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Name or setting..."
            />
          </label>
          <div class="archive-list">
          <p v-if="filteredItems.length === 0" class="archive-empty">
            No processed addendums are currently archived.
          </p>
          <button
            v-for="item in filteredItems"
            :key="item.id"
            type="button"
            class="archive-item"
            @click="openAddendum(item.id)"
          >
            <strong>{{ formatDocumentNumber(item.documentNumber) }}</strong>
            <span>{{ item.canonical }}</span>
            <span>{{ item.setting }}</span>
            <span>Times input: {{ item.inputCount }}</span>
            <time :datetime="new Date(item.firstExperimentedAt).toISOString()">
              First experimented: {{ formatDate(item.firstExperimentedAt) }}
            </time>
          </button>
          </div>
        </aside>

        <article class="archive-reading" aria-live="polite">
          <div v-if="detailLoading" class="archive-status">Opening record...</div>
          <div v-else-if="selected" class="response archive-entry">
            <h2>{{ formatDocumentNumber(selected.documentNumber) }}</h2>
            <p class="entry-meta">
              {{ selected.setting }}
            </p>
            <p class="entry-meta">
              First experimented: {{ formatDate(selected.firstExperimentedAt) }}
            </p>
            <p class="entry-meta">
              Times input: {{ selected.inputCount }}
            </p>
            <p v-if="selected.preamble" class="preamble">
              {{ selected.preamble }}
            </p>
            <div class="markdown" v-html="renderedBody"></div>
          </div>
          <p v-else class="archive-empty">
            Select a saved record to read it.
          </p>
        </article>
      </div>
    </section>
  </main>
</template>
