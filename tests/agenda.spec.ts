import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { Presentation } from '../src/types'

const records: Presentation[] = JSON.parse(readFileSync(new URL('../src/data/presentations.json', import.meta.url), 'utf8'))
const eventDates = [9, 10, 11, 12, 13]
const firstSlot = records.filter(item => item.date === '2026-11-10' && item.startTime === '08:30')
const title = 'NAPOEC: Núcleo antirracismo na poética cênica'
const names = ['Área', 'Modalidade', 'Sessão', 'Mesa / TV', 'Dia']

function countLabel(count: number) {
  return count.toLocaleString('pt-BR') + (count === 1 ? ' apresentação encontrada' : ' apresentações encontradas')
}

function openFilter(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true })
}

async function selectOptions(page: Page, filter: string, options: string[], query?: string) {
  const trigger = openFilter(page, filter)
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  if (query) await page.getByRole('searchbox', { name: 'Buscar opções' }).fill(query)
  for (const option of options) {
    const checkbox = page.getByRole('checkbox', { name: option, exact: true })
    await checkbox.check()
    await expect(checkbox).toBeChecked()
  }
  await page.getByRole('button', { name: 'Concluir', exact: true }).click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
}

test('grade fixa do evento, simultâneas e detalhes por teclado', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Apresentações do CONPEEX', exact: true })).toBeVisible()
  await expect(page.getByText('9 a 13 de novembro de 2026', { exact: true })).toBeVisible()
  const days = page.locator('.day-head')
  await expect(days).toHaveCount(eventDates.length)
  for (const [index, day] of eventDates.entries()) {
    await expect(days.nth(index)).toHaveAttribute('aria-label', new RegExp(', ' + day + ' de novembro de 2026$'))
  }
  for (const name of ['Semana anterior', 'Próxima semana', 'Semana do evento']) {
    await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0)
  }
  await expect(page.getByRole('status')).toContainText(countLabel(records.length))
  const more = page.getByRole('button', { name: new RegExp('Ver ' + firstSlot.length + ' apresentações.*terça-feira.*08:30') })
  await more.focus()
  await page.keyboard.press('Enter')
  const dialog = page.locator('dialog[open]')
  await expect(dialog.getByRole('heading', { name: '08:30', exact: true })).toBeVisible()
  await expect(dialog).toContainText('terça-feira, 10 de novembro de 2026')
  await expect(dialog.locator('.presentation-card')).toHaveCount(firstSlot.length)
  const firstCard = dialog.locator('.presentation-card').first()
  await expect(firstCard).toContainText('Arcanjo Rodrigues Moura')
  await expect(firstCard).toContainText('08:30–08:35')
  await expect(firstCard).toContainText('Mesa 01')
  await expect(firstCard).toContainText('PROBEC')
  const border = await firstCard.evaluate(element => {
    const style = getComputedStyle(element)
    return { left: style.borderLeftWidth, top: style.borderTopWidth, leftColor: style.borderLeftColor, topColor: style.borderTopColor }
  })
  expect(border.left).toEqual(border.top)
  expect(border.leftColor).toEqual(border.topColor)
  await dialog.getByRole('button', { name: title, exact: true }).click()
  await expect(dialog.getByRole('heading', { name: title, exact: true })).toBeVisible()
  await expect(dialog).toContainText('08:30–08:35')
  await expect(dialog).toContainText('Arcanjo Rodrigues Moura')
  await expect(dialog).toContainText('A descrição deste trabalho não foi fornecida')
  await expect(dialog.getByText(/Fonte da programação|Programação_Mesas\.pdf/i)).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Voltar ao horário' }).click()
  await expect(dialog.locator('.presentation-card')).toHaveCount(firstSlot.length)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(more).toBeFocused()
  expect(errors).toEqual([])
})

test('períodos delimitam os horários pela hora de início', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('./')
  const wholeDay = page.getByRole('button', { name: 'Todo o dia', exact: true })
  await expect(wholeDay).toHaveAttribute('aria-pressed', 'true')
  const times = page.locator('.weekly-calendar .time-row .time-label')
  for (const [label, min, max] of [['Manhã', '00:00', '12:00'], ['Tarde', '12:00', '18:00'], ['Noite', '18:00', '24:00']] as const) {
    const period = page.getByRole('button', { name: label, exact: true })
    await period.click()
    await expect(period).toHaveAttribute('aria-pressed', 'true')
    const expected = records.filter(item => item.startTime && min <= item.startTime && item.startTime < max)
    await expect(page.getByRole('status')).toContainText(countLabel(expected.length))
    const labels = (await times.allTextContents()).map(label => label.trim())
    expect(labels).toHaveLength(new Set(expected.map(item => item.startTime)).size)
    expect(labels.every(time => min <= time && time < max)).toBe(true)
  }
  await wholeDay.click()
  await expect(page.getByRole('status')).toContainText(countLabel(records.length))
  await expect(page.locator('.weekly-calendar').getByText('Horário a confirmar', { exact: true })).toHaveCount(1)
})

test('busca, filtros próprios e seleção múltipla combinam critérios', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.goto('./')
  const search = page.getByRole('searchbox', { name: 'Pesquisar apresentações' })
  for (const query of ['nucleo antirracismo na poetica', 'arcanjo rodrigues']) {
    await search.fill(query)
    await expect(page.getByRole('status')).toContainText(countLabel(1))
    await expect(page.getByRole('button', { name: title, exact: true })).toBeVisible()
  }
  await search.fill('')
  const areaTrigger = openFilter(page, 'Área')
  await areaTrigger.focus()
  await page.keyboard.press('Enter')
  await expect(areaTrigger).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('checkbox', { name: 'Engenharias', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(areaTrigger).toHaveAttribute('aria-expanded', 'false')
  await expect(areaTrigger).toBeFocused()
  await selectOptions(page, 'Área', ['Linguística, Letras e Artes', 'Engenharias'])
  await selectOptions(page, 'Modalidade', ['Mostra da Pós-Graduação Stricto Sensu e Lato Sensu'])
  await selectOptions(page, 'Sessão', ['Sessão 08'])
  await selectOptions(page, 'Mesa / TV', ['TV 12'], 'tv 12')
  const day = openFilter(page, 'Dia')
  await day.click()
  const option = page.getByRole('button', { name: /quarta-feira, 11 de novembro de 2026/i, exact: true })
  await option.click()
  await expect(day).toHaveAttribute('aria-expanded', 'false')
  const expected = records.filter(item => (item.knowledgeArea === 'Lingüística, Letras e Artes' || item.knowledgeArea === 'Engenharias')
    && item.modality === 'Mostra da Pós-Graduação Stricto Sensu e Lato Sensu'
    && item.session === 'Sessão 08' && item.table === 'TV 12' && item.date === '2026-11-11')
  expect(expected.length).toBeGreaterThan(0)
  await expect(page.getByRole('status')).toContainText(countLabel(expected.length))
  await expect(page.locator('.day-head')).toHaveCount(eventDates.length)
  await expect(page.locator('.filter-bar select')).toHaveCount(0)
  await expect(page.locator('.filter-bar')).not.toHaveCSS('position', 'sticky')
  await search.fill('zzzzz sem correspondência')
  await expect(page.locator('.weekly-calendar').getByText('Nenhum resultado por aqui')).toBeVisible()
  await page.getByRole('button', { name: 'Limpar tudo' }).click()
  await expect(search).toHaveValue('')
  await expect(page.getByRole('status')).toContainText(countLabel(records.length))
  for (const name of names) await expect(openFilter(page, name)).toHaveAttribute('aria-expanded', 'false')
})

test('mobile mantém cinco dias, períodos e painéis dentro da largura da tela', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 })
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await page.goto('./')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const dayPicker = page.getByRole('group', { name: 'Escolher dia' })
  await expect(dayPicker.getByRole('button')).toHaveCount(eventDates.length)
  for (const [index, day] of eventDates.entries()) {
    await expect(dayPicker.getByRole('button').nth(index)).toHaveAccessibleName(new RegExp(', ' + day + ' de novembro de 2026$'))
  }
  const tuesday = dayPicker.getByRole('button', { name: /terça-feira/ })
  await expect(tuesday).toHaveAttribute('aria-pressed', 'true')
  await dayPicker.getByRole('button', { name: /quarta-feira/ }).click()
  await page.getByRole('button', { name: 'Noite', exact: true }).click()
  const evening = page.locator('.daily-slot').first()
  await expect(evening.getByRole('heading')).toContainText(/^(18|19|20|21|22|23):/)
  await page.getByRole('button', { name: 'Todo o dia', exact: true }).click()
  await dayPicker.getByRole('button', { name: /segunda-feira/ }).click()
  await expect(page.locator('.daily-calendar').getByText('Nenhuma apresentação neste dia')).toBeVisible()
  await tuesday.click()
  const firstGroup = page.locator('.daily-slot').first()
  await firstGroup.getByRole('button', { name: new RegExp('Ver ' + firstSlot.length + ' apresentações') }).click()
  const dialog = page.locator('dialog[open]')
  await expect(dialog.locator('.presentation-card')).toHaveCount(firstSlot.length)
  await dialog.getByRole('button', { name: title, exact: true }).click()
  await expect(dialog.getByRole('heading', { name: title, exact: true })).toBeVisible()
  const bounds = await dialog.boundingBox()
  expect(bounds!.y + bounds!.height).toBeCloseTo(780, 0)
  const help = dialog.getByRole('button', { name: 'O que significa PROBEC?' })
  await help.focus()
  await page.keyboard.press('Enter')
  const explanation = page.getByRole('dialog', { name: 'O que significa PROBEC?', exact: true })
  await expect(explanation).toContainText(/Programa de Bolsas de Extensão e Cultura/i)
  await page.keyboard.press('Escape')
  await expect(explanation).toBeHidden()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Fechar detalhes' }).click()
  await expect(dialog).toHaveCount(0)
  await openFilter(page, 'Mesa / TV').click()
  await expect(page.getByRole('searchbox', { name: 'Buscar opções' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
  await page.keyboard.press('Escape')
  await expect(openFilter(page, 'Mesa / TV')).toHaveAttribute('aria-expanded', 'false')
  await openFilter(page, 'Mesa / TV').click()
  await page.getByRole('heading', { name: 'Apresentações do CONPEEX' }).click()
  await expect(openFilter(page, 'Mesa / TV')).toHaveAttribute('aria-expanded', 'false')
})

test('tema segue o sistema na primeira visita e preserva escolha explícita', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('./')
  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-theme', 'dark')
  const surfaceColors = () => page.evaluate(() => [document.documentElement, document.body].map(node => getComputedStyle(node).backgroundColor))
  const darkColors = await surfaceColors()
  await page.getByRole('button', { name: 'Ativar tema claro', exact: true }).click()
  await expect(html).toHaveAttribute('data-theme', 'light')
  expect(await surfaceColors()).not.toEqual(darkColors)
  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'light')
  await page.getByRole('button', { name: 'Ativar tema escuro', exact: true }).click()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'dark')
})

test('busca preserva título e autoria em colunas distintas do PDF', async ({ page }) => {
  const source = records.find(item => item.title.startsWith('DIAGNÓSTICO TARDIO DE FIBROSE CÍSTICA'))
  expect(source?.authors).toContain('LUZINETE REZENDE DA INCARNACAO')
  await page.goto('./')
  await page.getByRole('searchbox', { name: 'Pesquisar apresentações' }).fill('diagnostico tardio de fibrose cistica')
  await page.getByRole('button', { name: /^Diagnóstico tardio de fibrose cística/ }).click()
  const dialog = page.locator('dialog[open]')
  await expect(dialog.getByRole('heading', { name: /^Diagnóstico tardio de fibrose cística/ })).toBeVisible()
  await expect(dialog.getByText('Luzinete Rezende da Incarnacao', { exact: true })).toBeVisible()
})

test('agenda mostra falha do carregamento e oferece nova tentativa', async ({ page }) => {
  let fail = true
  const outOfRange = { ...records[0], id: 'extra-week', title: 'Apresentação fora do evento', date: '2026-11-30' }
  await page.route('**/assets/presentations-*.json', async route => {
    if (fail) await route.fulfill({ status: 503 })
    else await route.fulfill({ json: [...records, outOfRange] })
  })
  await page.goto('./')
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar a programação')
  fail = false
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('status')).toContainText(countLabel(records.length))
  await openFilter(page, 'Dia').click()
  await expect(page.getByRole('button', { name: /30 de novembro de 2026/ })).toHaveCount(0)
})
