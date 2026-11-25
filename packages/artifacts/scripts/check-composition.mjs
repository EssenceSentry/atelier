import assert from "node:assert/strict"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { chromium } from "playwright"
import { pack } from "./pack.mjs"
import { controlFindings } from "./ui-checks.mjs"

// Maintainer checks own layout/state contracts so artifact authors need not review
// routine controls visually. Exercise populated/empty and hidden/shown states.
const dir = path.resolve(process.argv[2] ?? "/private/tmp/atelier-composition-check")
await mkdir(dir, { recursive: true })
await writeFile(
  path.join(dir, "artifact.json"),
  JSON.stringify({
    title: "Composition contract fixture",
    release: "0.1.0",
    theme: "instrument",
    mode: "light",
    profile: "portable",
    families: [
      "table",
      "flow",
      "vega",
      "carousel",
      "markdown",
      "code",
      "media",
      "mermaid",
      "icons",
    ],
    source: "main.js",
  })
)
await writeFile(
  path.join(dir, "main.js"),
  `const book = Atelier.notebook({title:"Composition fixture"});
const cell = book.cell({id:"workspace",title:"Stateful views",controls:true});
const stack = Atelier.stack(cell.view);
Atelier.notice(stack,{title:"Supplied test fixture",text:"No production data."});
const metrics = Atelier.metrics(stack,[{label:"Records",value:16},{label:"Panels",value:3}]);
Atelier.mount("markdown",stack,{source:"A summary mounted beside metrics and tabs."});
const note = Atelier.field(cell.controls,{label:"Draft",type:"textarea",value:""});
Atelier.field(cell.controls,{label:"Level",type:"range",min:0,max:10,value:3});
const actions = Atelier.toolbar(cell.controls);
let invoked = 0;
const save = Atelier.button("Save",async node=>{invoked++; await new Promise(r=>setTimeout(r,150));node.disabled=true;},actions,{variant:"primary",busyLabel:"Saving…"});
let rows = Array.from({length:16},(_,i)=>({id:"r"+i,name:"Record "+String(i).padStart(2,"0"),status:"Pending"}));
const columns = [{key:"name",title:"Name"},{key:"status",title:"Status",type:"select",options:["Pending","Done"]}];
let table,flow;
let flowMounts = 0;
const graph = {nodes:Array.from({length:12},(_,i)=>({id:"n"+i,data:{label:"Service "+i+" — a long label",description:"A long description that must wrap without overlapping another card in the automatic layout.",status:i%2?"Ready":"Warning"}})),edges:Array.from({length:11},(_,i)=>({id:"e"+i,source:"n"+i,target:"n"+(i+1)})),onNodeClick:()=>{}};
const icons = Atelier.modules.icons;
graph.nodes[0].data.icon = icons.url(icons.catalog.find(item=>item.icon?.body.includes("currentColor")).id);
graph.nodes[1].data.icon = icons.url("missing:decorative-icon",{optional:true});
const tabs = Atelier.tabs(stack,{label:"Workspace views",items:[
{id:"records",label:"Records",render:panel=>(table=Atelier.mount("table",panel,{data:rows,columns,pageSize:4}))},
{id:"diagram",label:"Diagram",render:panel=>{flowMounts++;flow=Atelier.mount("flow",panel,graph);flow.ready.then(()=>Atelier.canvasLink(flow,graph,{parent:cell.controls}));return flow;}},
{id:"help",label:"Help",render:panel=>Atelier.mount("markdown",panel,{source:"Full width fixture documentation."})}
]});
const empty = book.cell({id:"empty",title:"Filter recovery"});
const spec = values=>({data:{values},mark:"point",encoding:{x:{field:"x",type:"quantitative"},y:{field:"y",type:"quantitative"}}});
const chart = Atelier.mount("vega",empty.view,{spec:spec([])});
const slides = book.cell({id:"slides",title:"Carousel"});
const carousel = Atelier.mount("carousel",slides.view,{slides:[{title:"First"},{title:"Last"}]});
const snippets = book.cell({id:"snippets",title:"Syntax and media",controls:true});
Atelier.field(snippets.controls,{label:"Mode",value:"One",options:["One","Two"],description:"Help remains below the correctly aligned arrow."});
const snippetStack = Atelier.stack(snippets.view);
const codeHost = Atelier.element("div");snippetStack.append(codeHost);
Atelier.mount("code",codeHost,{language:"javascript",source:"const selected = 1;"});
const editorHost = Atelier.element("div");snippetStack.append(editorHost);
const editor = Atelier.mount("editor",editorHost,{language:"json",source:'{"id":1}'});
const imageHost = Atelier.element("div");snippetStack.append(imageHost);
const image = "data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><text x="20" y="50">Illustration</text></svg>');
const mediaOptions = {type:"compare",before:image,after:image,controls:snippets.controls};
const media = Atelier.mount("media",imageHost,mediaOptions);
const textDiagram = book.cell({id:"text-diagram",title:"Text diagram",controls:true});
const mermaid = Atelier.mount("mermaid",textDiagram.view,{source:"flowchart LR\\n"+Array.from({length:11},(_,i)=>"n"+i+"[Service "+i+"] --> n"+(i+1)+"[Service "+(i+1)+"]").join("\\n"),controls:textDiagram.controls});
await tabs.ready;
window.contract={tabs,chart,spec,carousel,metrics,note,save,editor,media,mediaOptions,mermaid,get table(){return table},get flow(){return flow},get flowMounts(){return flowMounts},get invoked(){return invoked},update:count=>table.update({data:rows.slice(0,count).map(r=>({...r})),columns,pageSize:4})};`
)
await pack(path.join(dir, "artifact.json"), path.join(dir, "output.html"))
const browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader"] })
const results = []
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto(`file://${dir}/output.html`)
  await page.waitForFunction(() => document.documentElement.dataset.artifactReady === "true")
  assert.equal(await page.locator(".react-flow").count(), 0, "Hidden tabs must mount lazily")
  assert.equal(
    await page.locator("#workspace .at-metric").count(),
    2,
    "Stack mounts must retain sibling metrics"
  )
  assert.equal(await page.locator("#workspace .at-notice").count(), 1)
  await page.getByRole("textbox", { name: "Draft", exact: true }).fill("Unsent note")
  await page.getByRole("slider", { name: "Level", exact: true }).fill("7")
  assert.equal(await page.locator("#workspace .at-field-value").innerText(), "7")
  const save = page.getByRole("button", { name: "Save", exact: true })
  await save.click()
  await page.getByRole("button", { name: "Saving…", exact: true }).waitFor()
  await page.waitForFunction(() => contract.save.disabled)
  assert.equal(await save.isDisabled(), true, "Async action must retain its disabled result")
  assert.equal(await page.evaluate(() => contract.invoked), 1)
  await page.getByRole("button", { name: "Name", exact: true }).click()
  await page.locator("#workspace").getByRole("button", { name: "Next", exact: true }).click()
  await page.evaluate(() => contract.update(16))
  assert.deepEqual(
    await page.evaluate(() => ({
      page: contract.table.api.table.getState().pagination.pageIndex,
      sort: contract.table.api.table.getState().sorting,
    })),
    { page: 1, sort: [{ id: "name", desc: false }] }
  )
  await page.getByRole("textbox", { name: "Filter records", exact: true }).fill("Record")
  await page.evaluate(() => contract.update(3))
  await page.waitForFunction(() => contract.table.api.table.getState().pagination.pageIndex === 0)
  assert.equal(await page.getByRole("textbox", { name: "Filter records" }).inputValue(), "Record")
  results.push("table update retains search/sort/page and clamps shorter data")

  await page.getByRole("tab", { name: "Diagram", exact: true }).click()
  await page.waitForFunction(() => contract.flow?.api?.flow?.getNodes().length === 12)
  await page.waitForTimeout(200)
  const camera = await page.evaluate(() => contract.flow.api.flow.getViewport())
  const initialIcon = await page.evaluate(() => contract.flow.api.flow.getNode("n0").data.icon)
  assert.ok(camera.zoom >= 0.9, `Large diagram must open readably: ${camera.zoom}`)
  const overlaps = await page.evaluate(() => {
    const nodes = contract.flow.api.flow.getNodes()
    return nodes.flatMap((a, i) =>
      nodes
        .slice(i + 1)
        .filter(
          (b) =>
            a.position.x < b.position.x + b.measured.width &&
            a.position.x + a.measured.width > b.position.x &&
            a.position.y < b.position.y + b.measured.height &&
            a.position.y + a.measured.height > b.position.y
        )
        .map((b) => [a.id, b.id])
    )
  })
  assert.deepEqual(overlaps, [], "Measured Flow cards must not overlap")
  await page.evaluate(() => contract.flow.api.flow.setViewport({ x: 20, y: 40, zoom: 1.2 }))
  await page.getByRole("tab", { name: "Records", exact: true }).click()
  await page.getByRole("tab", { name: "Diagram", exact: true }).click()
  await page.evaluate(() => Atelier.settled())
  const restored = await page.evaluate(() => contract.flow.api.flow.getViewport())
  assert.equal(restored.zoom, 1.2)
  assert.equal(await page.evaluate(() => contract.flowMounts), 1)
  assert.equal(
    await page.getByRole("textbox", { name: "Draft", exact: true }).inputValue(),
    "Unsent note"
  )
  results.push(
    "lazy tabs preserve instances, draft and diagram camera; large labels do not overlap"
  )
  const popupEvent = page.waitForEvent("popup")
  await page.getByRole("button", { name: "Open canvas in new tab", exact: true }).click()
  const popup = await popupEvent
  await popup.waitForFunction(() => document.documentElement.dataset.artifactReady === "true")
  assert.equal(await popup.locator(".at-nav").count(), 0)
  assert.equal(await popup.locator(".react-flow__node").count(), 12)
  await popup.close()
  results.push("canvas snapshot accepts UI callbacks and opens independent canvas")

  await page.getByRole("tab", { name: "Diagram", exact: true }).focus()
  await page.keyboard.press("End")
  assert.equal(
    await page.getByRole("tab", { name: "Help", exact: true }).getAttribute("aria-selected"),
    "true"
  )
  await page.keyboard.press("Home")
  assert.equal(
    await page.getByRole("tab", { name: "Records", exact: true }).getAttribute("aria-selected"),
    "true"
  )
  assert.equal(await page.locator("#empty .at-empty").count(), 1)
  await page.evaluate(() => contract.chart.update({ spec: contract.spec([{ x: 1, y: 2 }]) }))
  assert.equal(await page.locator("#empty .at-empty").count(), 0)
  assert.ok(await page.locator("#empty svg").count())
  await page.evaluate(() => contract.chart.update({ spec: contract.spec([]) }))
  assert.equal(await page.locator("#empty .at-empty").count(), 1)
  results.push("keyboard tabs and Vega empty/populated recovery")
  await page.locator("#slides").getByRole("button", { name: "Next slide", exact: true }).click()
  await page.getByText("2 / 2", { exact: true }).waitFor()
  assert.equal(
    await page.getByRole("button", { name: "Next slide", exact: true }).isDisabled(),
    true
  )
  results.push("carousel final button retains disabled state")
  assert.ok(await page.locator("#snippets .at-code-block .hljs-keyword").count())
  await page.evaluate(() =>
    contract.editor.update({ language: "sql", source: "SELECT id FROM records;" })
  )
  assert.ok(await page.locator("#snippets .cm-editor .at-code-keyword").count())
  for (let i = 0; i < 3; i++)
    await page.evaluate(() => contract.media.update(contract.mediaOptions))
  assert.equal(await page.locator('#snippets .at-controls input[type="range"]').count(), 1)
  assert.equal(await page.locator('#snippets .at-view input[type="range"]').count(), 0)
  assert.equal(await page.evaluate(() => "controls" in contract.media.api.snapshot()), false)
  const selectShell = await page.getByLabel("Mode", { exact: true }).evaluate((node) => ({
    input: node.getBoundingClientRect().height,
    shell: node.parentElement.getBoundingClientRect().height,
    arrow: getComputedStyle(node.parentElement, "::after").top,
  }))
  assert.equal(selectShell.input, selectShell.shell)
  assert.ok(Math.abs(parseFloat(selectShell.arrow) - selectShell.input / 2) < 1)
  assert.deepEqual(await page.evaluate(controlFindings), [])
  const tableSelect = page.locator("#workspace tbody select").first()
  const flushArrow = await page.addStyleTag({
    content: ".at-select-shell::after { inset-inline-end: 0; }",
  })
  assert.ok(
    (await page.evaluate(controlFindings)).some((item) => item.issue === "select-arrow-edge")
  )
  await flushArrow.evaluate((node) => node.remove())
  await tableSelect.evaluate((node) => {
    node.parentElement.style.width = "70px"
    node.style.padding = "8px"
  })
  assert.ok(
    (await page.evaluate(controlFindings)).some((item) => item.issue === "select-arrow-clearance")
  )
  await tableSelect.evaluate((node) => {
    node.parentElement.style.removeProperty("width")
    node.style.removeProperty("padding")
  })
  assert.deepEqual(await page.evaluate(controlFindings), [])
  results.push(
    "read-only syntax, editor language updates, left media controls and select arrow alignment"
  )
  assert.ok(await page.evaluate(() => contract.mermaid.api.panzoom.getScale() >= 0.9))
  await page
    .locator("#text-diagram")
    .getByRole("button", { name: "Fit diagram", exact: true })
    .click()
  await page.waitForTimeout(80)
  const fitted = await page.locator("#text-diagram .at-canvas").evaluate((node) => {
    const frame = node.getBoundingClientRect(),
      svg = node.querySelector("svg").getBoundingClientRect()
    return (
      svg.left >= frame.left &&
      svg.right <= frame.right &&
      svg.top >= frame.top &&
      svg.bottom <= frame.bottom
    )
  })
  assert.ok(fitted, "Fit must place the whole Mermaid diagram inside the viewport")
  await page.evaluate(() => {
    contract.mermaid.api.panzoom.zoom(1.2, { force: true })
    contract.mermaid.api.panzoom.pan(30, 40, { force: true })
  })
  await page.waitForTimeout(80)
  const mermaidState = await page.evaluate(() => contract.mermaid.api.snapshot().viewport)
  await page.evaluate(() => Atelier.theme("editorial", "dark"))
  await page.evaluate(() => Atelier.settled())
  assert.notEqual(
    await page.evaluate(() => contract.flow.api.flow.getNode("n0").data.icon),
    initialIcon
  )
  const optional = await page.evaluate(() => {
    const icons = Atelier.modules.icons
    const brand = icons.url(icons.catalog.find((item) => item.id.startsWith("aws:")).id)
    let strictError = ""
    try {
      icons.url("missing:decorative-icon")
    } catch (error) {
      strictError = error.message
    }
    return {
      absent: icons.url("missing:decorative-icon", { optional: true }) ?? null,
      strictError,
      brandUnchanged: icons.refreshURL(brand) === brand,
    }
  })
  assert.equal(optional.absent, null)
  assert.match(optional.strictError, /Unknown bundled icon/)
  assert.equal(optional.brandUnchanged, true)
  results.push(
    "optional diagram icons cannot abort rendering; monochrome icons follow theme and brand art stays intact"
  )
  assert.deepEqual(
    await page.evaluate(() => contract.mermaid.api.snapshot().viewport),
    mermaidState
  )
  results.push(
    "Mermaid readable scale, correct overview fit and camera preservation on theme change"
  )
  for (const theme of ["instrument", "editorial", "console"]) {
    for (const mode of ["light", "dark"]) {
      await page.evaluate(([t, m]) => Atelier.theme(t, m), [theme, mode])
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 1000 })
        await page.evaluate(() => Atelier.settled())
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      }
    }
  }
  assert.deepEqual(errors, [])
  results.push("three themes, two modes, populated desktop/phone resize without overflow/errors")
  await page.evaluate(() => scrollTo(0, 0))
  await page.screenshot({ path: path.join(dir, "contract.png"), fullPage: true })
} finally {
  await browser.close()
  await writeFile(path.join(dir, "results.json"), JSON.stringify({ results }, null, 2))
}
console.log(JSON.stringify({ checked: results.length, results, dir }, null, 2))
