<!--
  The Rules tab of Settings, two parts saved together, by themselves (no Save button):

  - Naming rules: define the repository name displayed in the repositories page. Each rule has a search query (a regular
    expression, case-insensitive) and a replacement, a text (`$1`… are the query's groups) or an
    image file (chosen with the file dialog). Rules apply in order, each on the result of the
    previous one. A "Try a name" field shows the result for any repository name (an image shows as
    ⟨image⟩).
    Naming rules always apply to the repository's name (without its org).
  - Tags rules: give tags to repositories. Each rule has a search query, a target selector (what
    the query is tested on: repo name, org/repo name, org, or local path), and the tags (separated by commas) a match gives; several rules can match.

  The rules are saved after a short pause once they are valid (a search query that is a valid
  regular expression, an image chosen, tags given); what keeps them from being saved is said under
  the rules. The Repos page then shows the new names, tags and tag colors at once.
-->
<template>
  <section class="settings-tab">
    <div class="settings-tab">
      <section class="rules-section" aria-label="Naming rules">
        <h4>Naming rules</h4>
        <p class="settings-hint">
          Define the repository name displayed in the repositories page (the card's title), built
          from the repository's folder name. Search queries are regular expressions, applied in
          order, each on the result of the previous one; the replacement is a text or an image.
          Dashes and underscores then separate the words, each starting with a capital letter.
        </p>
        <p v-if="namingRules.length === 0" class="settings-hint">No naming rules.</p>
        <ul class="rule-list">
          <li v-for="(rule, index) in namingRules" :key="index" class="rule naming-rule">
            <input
              v-model="rule.search"
              type="text"
              class="rule-search"
              :class="{ 'rule-search--invalid': !isValidRegex(rule.search) }"
              placeholder="Search query (regex)"
              spellcheck="false"
              :aria-label="`Naming rule ${index + 1} search query`"
            />
            <span aria-hidden="true">→</span>
            <select v-model="rule.type" :aria-label="`Naming rule ${index + 1} replacement type`">
              <option value="text">Text</option>
              <option value="image">Image</option>
            </select>
            <input
              v-model="rule.value"
              type="text"
              class="rule-value"
              :placeholder="rule.type === 'image' ? 'Image path' : 'Replacement text'"
              spellcheck="false"
              :aria-label="`Naming rule ${index + 1} replacement`"
            />
            <template v-if="rule.type === 'image'">
              <button type="button" @click="browse(rule)">Browse…</button>
              <img
                v-if="previews[rule.value]"
                :src="previews[rule.value]!"
                class="rule-image-preview"
                alt="Replacement image"
              />
              <span v-else-if="rule.value" class="rule-image-missing" title="Image not readable"
                >?</span
              >
            </template>
            <span class="rule-moves">
              <button
                type="button"
                :disabled="index === 0"
                aria-label="Move up"
                @click="move(namingRules, index, -1)"
              >
                ↑
              </button>
              <button
                type="button"
                :disabled="index === namingRules.length - 1"
                aria-label="Move down"
                @click="move(namingRules, index, 1)"
              >
                ↓
              </button>
              <button type="button" aria-label="Delete rule" @click="namingRules.splice(index, 1)">
                Delete
              </button>
            </span>
          </li>
        </ul>
        <button type="button" class="settings-button" @click="addNamingRule">
          Add a naming rule
        </button>
        <label class="settings-field">
          <span>Try a repository name</span>
          <input
            v-model="sampleName"
            type="text"
            spellcheck="false"
            placeholder="shop-checkout-payment-pay-landingpage"
            aria-label="Repository name to try"
          />
          <small class="settings-hint"
            >Displayed name: <strong class="rule-sample">{{ sampleResult }}</strong></small
          >
        </label>
      </section>

      <section class="rules-section" aria-label="Tags rules">
        <h4>Tags rules</h4>
        <p class="settings-hint">
          Give tags to the repositories whose name, org or path matches a search query (a regular
          expression), tested on the target you choose. A rule gives all its tags, separated by
          commas; every matching rule applies.
        </p>
        <p v-if="tagRules.length === 0" class="settings-hint">No tag rules.</p>
        <ul class="rule-list">
          <li v-for="(rule, index) in tagRules" :key="index" class="rule tag-rule">
            <select
              v-model="rule.target"
              class="rule-target"
              :aria-label="`Tag rule ${index + 1} target`"
              title="What the query is tested on"
            >
              <option v-for="target in tagRuleTargets" :key="target" :value="target">
                {{ tagRuleTargetLabels[target] }}
              </option>
            </select>
            <input
              v-model="rule.search"
              type="text"
              class="rule-search"
              :class="{ 'rule-search--invalid': !isValidRegex(rule.search) }"
              placeholder="Search query (regex)"
              spellcheck="false"
              :aria-label="`Tag rule ${index + 1} search query`"
            />
            <span aria-hidden="true">→</span>
            <input
              v-model="rule.tags"
              type="text"
              class="rule-value"
              placeholder="Tags, separated by commas"
              spellcheck="false"
              :aria-label="`Tag rule ${index + 1} tags`"
            />
            <span class="rule-moves">
              <button
                type="button"
                :disabled="index === 0"
                aria-label="Move up"
                @click="move(tagRules, index, -1)"
              >
                ↑
              </button>
              <button
                type="button"
                :disabled="index === tagRules.length - 1"
                aria-label="Move down"
                @click="move(tagRules, index, 1)"
              >
                ↓
              </button>
              <button type="button" aria-label="Delete rule" @click="tagRules.splice(index, 1)">
                Delete
              </button>
            </span>
          </li>
        </ul>
        <button
          type="button"
          class="settings-button"
          @click="tagRules.push({ search: '', tags: '', target: 'name' })"
        >
          Add a tag rule
        </button>

        <div class="tag-colors" aria-label="Tag colors">
          <h5>Tag colors</h5>
          <p class="settings-hint">
            Each tag of the rules above gets a color worked out from its name. Choose another one
            with the color field; “Auto” goes back to the automatic color.
          </p>
          <p v-if="allTags.length === 0" class="settings-hint">No tags yet.</p>
          <ul class="tag-color-list">
            <li v-for="tag in allTags" :key="tag" class="tag-color">
              <span
                class="tag-color-chip"
                :style="{
                  background: tagColors(tag, tagColorDrafts).background,
                  color: tagColors(tag, tagColorDrafts).foreground
                }"
                >{{ tag }}</span
              >
              <input
                type="color"
                :value="tagColors(tag, tagColorDrafts).background.toLowerCase()"
                :aria-label="`Color of the tag ${tag}`"
                @input="
                  tagColorDrafts[tag] = ($event.target as HTMLInputElement).value.toUpperCase()
                "
              />
              <button
                v-if="tag in tagColorDrafts"
                type="button"
                :aria-label="`Automatic color for ${tag}`"
                @click="delete tagColorDrafts[tag]"
              >
                Auto
              </button>
            </li>
          </ul>
        </div>
      </section>

      <AutoSaveStatus :status="autoSave.status.value" :message="autoSave.message.value" />
      <p v-if="loadError" class="settings-message settings-message--error" role="alert">
        {{ loadError }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'

import { useAutoSave } from '../../settings/use-auto-save'
import { tagColors } from '../../../../shared/tag-colors'
import AutoSaveStatus from './AutoSaveStatus.vue'
import type { IpcApi } from '../../../../shared/ipc-contract'
import {
  applyNamingRules,
  splitTags,
  validateRepoRules,
  tagRuleTargetLabels,
  tagRuleTargets,
  type TagRuleTarget,
  type NamingRule,
  type RepoRules
} from '../../../../shared/repo-rules'

/** A tag rule as edited: its tags are the text typed. */
interface TagRuleDraft {
  search: string
  tags: string
  target: TagRuleTarget
}

/** The main-process API, absent outside the desktop app. */
const api: IpcApi | undefined = (window as { api?: IpcApi }).api

const namingRules = ref<NamingRule[]>([])
const tagRules = ref<TagRuleDraft[]>([])
const tagColorDrafts = reactive<Record<string, string>>({})
const sampleName = ref('')
/** The data URL of each image path of the rules, `null` when it can't be read. */
const previews = reactive<Record<string, string | null>>({})
const loadError = ref('')

/** Every tag the tag rules give, in order, without duplicates. */
const allTags = computed(() => [...new Set(tagRules.value.flatMap((rule) => splitTags(rule.tags)))])

/** The repository name displayed in the repositories page that the rules give the sample name. */
const sampleResult = computed(() => {
  if (sampleName.value.trim() === '') return '—'
  const parts = applyNamingRules(sampleName.value.trim(), namingRules.value)
  return parts.map((part) => (part.type === 'text' ? part.text : '⟨image⟩')).join(' ') || '—'
})

/**
 * Tells whether a search query is a valid regular expression.
 *
 * @param search - the query.
 */
function isValidRegex(search: string): boolean {
  try {
    new RegExp(search, 'i')
    return true
  } catch {
    return false
  }
}

/**
 * Moves a rule one place.
 *
 * @param list - the rules.
 * @param index - the rule's place.
 * @param offset - -1 for up, 1 for down.
 */
function move<T>(list: T[], index: number, offset: -1 | 1): void {
  const [rule] = list.splice(index, 1)
  list.splice(index + offset, 0, rule!)
}

/** Adds an empty naming rule. */
function addNamingRule(): void {
  namingRules.value.push({ search: '', type: 'text', value: '' })
}

/**
 * Reads an image rule's file, to show it.
 *
 * @param path - the image's path.
 */
async function loadPreview(path: string): Promise<void> {
  if (!api || path.trim() === '' || path in previews) return
  previews[path] = null
  try {
    previews[path] = await api.loadImage(path)
  } catch {
    previews[path] = null
  }
}

// An image path typed or chosen shows its image.
watch(
  () => namingRules.value.filter((rule) => rule.type === 'image').map((rule) => rule.value),
  (paths) => {
    for (const path of paths) {
      delete previews[path]
      void loadPreview(path)
    }
  },
  { flush: 'post' }
)

/**
 * Opens the file dialog and sets the rule's image.
 *
 * @param rule - the naming rule.
 */
async function browse(rule: NamingRule): Promise<void> {
  const path = await api?.pickImage()
  if (path) rule.value = path
}

/** The rules as the page edits them, in the shape the main process saves. */
function currentRules(): RepoRules {
  return {
    namingRules: namingRules.value.map((rule) => ({ ...rule })),
    tagRules: tagRules.value.map((rule) => ({
      search: rule.search,
      tags: splitTags(rule.tags),
      target: rule.target
    })),
    // Only the tags the rules still give keep their color.
    tagColors: Object.fromEntries(
      Object.entries(tagColorDrafts).filter(([tag]) => allTags.value.includes(tag))
    )
  }
}

const autoSave = useAutoSave({
  source: currentRules,
  validate: validateRepoRules,
  save: async (rules) => api?.saveRepoRules(rules) ?? { success: true }
})

onMounted(async () => {
  if (!api) return
  try {
    const rules = await api.getRepoRules()
    namingRules.value = rules.namingRules
    Object.assign(tagColorDrafts, rules.tagColors)
    tagRules.value = rules.tagRules.map((rule) => ({
      search: rule.search,
      tags: rule.tags.join(', '),
      target: rule.target
    }))
    for (const rule of rules.namingRules) if (rule.type === 'image') void loadPreview(rule.value)
  } catch {
    loadError.value = 'The rules couldn’t be read.'
  }
  autoSave.markSaved()
})
</script>

<style src="./settings-form.css"></style>
<style scoped>
.rules-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
}

.rules-section h4 {
  margin: 0;
}

.rule-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rule {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.rule input,
.rule select {
  padding: 5px 8px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: var(--color-background);
  color: var(--color-text);
}

.tag-colors h5 {
  margin: 8px 0 0;
}

.tag-color-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tag-color {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tag-color-chip {
  padding: 1px 10px;
  border-radius: 999px;
  font-size: 0.85em;
}

.tag-color input[type='color'] {
  width: 32px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: none;
  cursor: pointer;
}

.tag-color button {
  padding: 2px 8px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: var(--color-surface-raised);
  color: var(--color-text);
  cursor: pointer;
}

.rule-target {
  padding: 5px 8px;
}

.rule-search {
  flex: 1 1 200px;
  font-family: ui-monospace, monospace;
}

.rule-search--invalid {
  border-color: var(--color-danger);
}

.rule-value {
  flex: 1 1 200px;
}

.rule button {
  padding: 3px 10px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: var(--color-surface-raised);
  color: var(--color-text);
  cursor: pointer;
}

.rule button:disabled {
  opacity: 0.5;
  cursor: default;
}

.rule-moves {
  display: flex;
  gap: 4px;
}

.rule-image-preview {
  height: 24px;
  width: auto;
}

.rule-image-missing {
  color: var(--color-warning);
}
</style>
