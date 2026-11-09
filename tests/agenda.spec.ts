import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { Presentation } from '../src/types'

const records: Presentation[] = JSON.parse(readFileSync(new URL('../src/data/presentations.json', import.meta.url), 'utf8'))

const initialDate = '2026-11-10'
const firstSlot = records.filter(item => item.date === initialDate && item.startTime === '08:30')

test('semana, trabalhos simultâneos e modal por teclado', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Agenda acadêmica.' })).toBeVisible()
  await expect(page.locator('.day-head')).toHaveCount(5)
  await expect(page.getByRole('status')).toContainText(records.length.toLocaleString('pt-BR'))
  const more = page.getByRole('button', { name: new RegExp(`Ver ${firstSlot.length} apresentações.*08:30`) }).first()
  await more.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog.locator('.presentation-card')).toHaveCount(firstSlot.length)
  await dialog.getByRole('button', { name: /NAPOEC/ }).click()
  await expect(dialog.getByRole('heading', { name: /NAPOEC/ })).toBeVisible()
  await expect(dialog).toContainText('08:30–08:35')
  await expect(dialog).toContainText('Arcanjo Rodrigues Moura'.toUpperCase())
  await expect(dialog).toContainText('A descrição deste trabalho não foi fornecida')
  await dialog.getByRole('button', { name: 'Voltar ao horário' }).click()
  await expect(dialog.locator('.presentation-card')).toHaveCount(firstSlot.length)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(more).toBeFocused()
  await page.getByRole('button', { name: 'Próxima semana' }).click()
  await expect(page.getByRole('heading', { name: '16 a 20 de novembro de 2026' })).toBeVisible()
  await expect(page.locator('.weekly-calendar').getByText('Agenda livre neste período')).toBeVisible()
  await page.getByRole('button', { name: 'Semana anterior' }).click()
  await expect(more).toBeVisible()
  expect(errors).toEqual([])
})

test('busca insensível a acentos e os cinco filtros em conjunto', async ({ page }) => {
  await page.goto('./')
  const search = page.getByRole('searchbox')
  for (const text of ['nucleo antirracismo na poetica', 'arcanjo rodrigues']) {
    await search.fill(text)
    await expect(page.getByRole('status')).toContainText('1 apresentação encontrada')
    await expect(page.getByRole('button', { name: /NAPOEC/ })).toBeVisible()
  }
  await search.fill('')
  const filter = (name: string) => page.getByRole('combobox', { name, exact: true })
  await filter('Área').selectOption('Linguística, Letras e Artes')
  await filter('Modalidade').selectOption('Mostra da Pós-Graduação Stricto Sensu e Lato Sensu')
  await filter('Sessão').selectOption('Sessão 08')
  await filter('Mesa / TV').selectOption('TV 12')
  await filter('Dia').selectOption('2026-11-11')
  const expected = records.filter(item => item.knowledgeArea === 'Lingüística, Letras e Artes'
    && item.modality === 'Mostra da Pós-Graduação Stricto Sensu e Lato Sensu'
    && item.session === 'Sessão 08' && item.table === 'TV 12' && item.date === '2026-11-11')
  expect(expected.length).toBeGreaterThan(0)
  await expect(page.getByRole('status')).toContainText(`${expected.length} apresentações encontradas`)
  await search.fill('linguistica graduacao')
  await expect(page.getByRole('status')).toContainText(`${expected.length} apresentações encontradas`)
  await search.fill('zzzzz sem correspondência')
  await expect(page.locator('.weekly-calendar').getByText('Nenhum resultado por aqui')).toBeVisible()
  await page.getByRole('button', { name: 'Limpar tudo' }).click()
  await expect(search).toHaveValue('')
  await expect(page.getByRole('status')).toContainText(records.length.toLocaleString('pt-BR'))
  for (const name of ['Área', 'Modalidade', 'Sessão', 'Mesa / TV', 'Dia']) {
    await expect(filter(name)).toHaveValue('')
  }
})

test('agenda diária e painel inferior em tela estreita', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  const dayPicker = page.getByRole('group', { name: 'Escolher dia' })
  await expect(dayPicker.getByRole('button')).toHaveCount(5)
  await expect(dayPicker.getByRole('button', { name: /terça-feira/ })).toHaveAttribute('aria-pressed', 'true')
  const initialGroup = page.locator('.daily-slot').first()
  await expect(initialGroup.locator('.presentation-card')).toHaveCount(firstSlot.length)
  await page.getByRole('combobox', { name: 'Ir para um horário' }).selectOption('slot-2026-11-10-10:55')
  await expect(page.locator('[id="slot-2026-11-10-10:55"]')).toBeFocused()
  await page.evaluate(() => window.scrollTo(0, 0))
  await dayPicker.getByRole('button', { name: /segunda-feira/ }).click()
  await expect(page.getByText('Agenda livre neste período')).toBeVisible()
  await page.getByRole('searchbox').fill('arcanjo rodrigues')
  await expect(dayPicker.getByRole('button', { name: /terça-feira/ })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /NAPOEC/ }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const bounds = await dialog.boundingBox()
  expect(bounds!.y + bounds!.height).toBeCloseTo(780, 0)
  await dialog.getByRole('button', { name: 'Fechar detalhes' }).click()
  await expect(dialog).toBeHidden()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
})
