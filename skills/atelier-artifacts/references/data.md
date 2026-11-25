# Data, forms and chat

Choose `table` for rich DOM cells and operational review. Choose `grid` for dense
spreadsheet editing. JSON Crack visualizes nested structure rather than tabular data.

Table options: `{data,columns,rowId?,pageSize?,sorting?,search?,onChange?,columnDefs?,table?}`.
Set `search:false` when a linked search control already lives in the workspace rail.

```js
const columns = [
  {key:"thumbnail",title:"Preview",type:"image",altKey:"title"},
  {key:"title",title:"Title"},
  {key:"decision",title:"Decision",type:"select",options:["Pending","Accept","Reject"]},
  {key:"status",title:"Status",type:"badge",tone:value=>value==="Ready"?"success":"warning"},
  {key:"inspect",title:"Inspect",type:"button",action:row=>inspect(row)}
];
```

Select edits are held locally; `onChange(rows,rowIndex,key)` receives the new rows.
`handle.api.rows` exports current state. `update` replaces complete data/options
while retaining sorting, search and pagination (clamped when data gets shorter).
Use stable unique `id` values, or set `rowId` to the key containing them. Keep edits
in your complete source dataset via `onChange`, then derive filtered rows from it.
Action columns support `label`, `variant`, `busyLabel`, `disabled(row)` and async
`action(row)`; errors appear inline. Built-in sorting/filtering/pagination work locally. Real TanStack
`columnDefs` and `table` options are available for complex cells; use
`Atelier.React.createElement` if needed, not JSX.

Grid options: `{data,columns:[{id,title,width?,readonly?}],height?,validate?,onChange?,props?}`.
Strings/numbers/booleans map to typed Glide cells. `validate(row,index)` can reject
edits; tell the person why through an adjacent status message. `api.rows` reads edits.
`props` is the native escape hatch for Glide renderers and callbacks.

JSON: `{data,onNodeClick?,props?}`. Native `JSONCrack` props include layout direction,
collapsed paths and callbacks. JSON Crack uses an embedded data worker and needs the browser profile. Default render limit is 500 nodes; select a subtree
for large documents. `modules.json.{JSONCrack,parseGraph}` is available.

Syntax editing only: family `code`, mount `editor`, options
`{source,language:"sql"|"json",onChange?}`. `api.source` gets current source.
Read-only highlighted snippets use mount `code`, `{source,language:"sql"|"json"|"javascript"|"python"|...}`.
Common highlight.js languages are bundled. Unknown languages display as plain text.
Editor updates switch both text and SQL/JSON syntax mode.
Execution: family/mount `sql`, options `{tables:{name:rows},source,limit?,onResult?}`.
DuckDB uses local Arrow insertion, with extension autoload disabled. `api.connection`
and `api.database` expose DuckDB. SQL updates replace query text, not the database;
to replace tables, use its real connection. Inputs are not a remote SQL server.
The browser profile needs the emitted sibling assets and an HTTP server.

Forms: family/mount `inputs`, options
`{fields:[{key,label,type,options?,min?,max?,step?}],values,schema?,onChange?,onSubmit?}`.
`modules.inputs.z` is Zod. All callbacks get actual values. Local edits are not saved
unless a callback saves or exports them. Native date/file/media controls follow the
browser; no Python kernel or marimo reactivity runtime is present.

Chat: family/mount `chat`, `{adapter,emptyMessage?,placeholder?}`. Use an actual
assistant-ui ChatModelAdapter (`async *run({messages,abortSignal})`) that yields
`{content:[{type:"text",text: cumulativeText}]}`. Honour cancellation. The recipe
is explicitly scripted. A real service connection needs an authorized endpoint;
never embed secret tokens. The adapter handles UI/runtime, not inference hosting.
