#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const isGemini=process.env.GEMINI_PROJECT_DIR!==undefined;
const EXEC_RE=/^exec:(\S+)\n([\s\S]+)/;
function handleExec(command,cwd){
  const m=command.match(EXEC_RE);if(!m)return null;
  const[,langId,code]=m;
  const projectDir=process.env.CLAUDE_PROJECT_DIR||process.cwd();
  const loaderPath=path.join(projectDir,'lang/loader.js');
  if(!fs.existsSync(loaderPath))return null;
  const{loadLangPlugins}=require(loaderPath);
  const plugins=loadLangPlugins(projectDir);
  const plugin=plugins.find(p=>p.exec.match.test(command));
  if(!plugin){const av=plugins.map(p=>p.id).join(', ')||'none';return{block:true,reason:`No lang plugin for exec:${langId}. Available: ${av}. Use bun -e/node -e for nodejs.`};}
  const rc=[`const{loadLangPlugins}=require(${JSON.stringify(loaderPath)});`,
    `const plugins=loadLangPlugins(${JSON.stringify(projectDir)});`,
    `const plugin=plugins.find(p=>p.exec.match.test(${JSON.stringify(command)}));`,
    `if(!plugin){process.stdout.write('NO_PLUGIN');process.exit(0);}`,
    `plugin.exec.run(${JSON.stringify(code)},${JSON.stringify(cwd||projectDir)})`,
    `.then(o=>{process.stdout.write(String(o));process.exit(0);})`,
    `.catch(e=>{process.stderr.write(e.message);process.exit(1);});`].join('');
  const r=spawnSync('node',['-e',rc],{timeout:10000,encoding:'utf8'});
  if(r.error||r.status!==0)return{block:true,reason:`[EXEC ERROR]\n${r.error?r.error.message:(r.stderr||'exec failed')}`};
  return{block:true,reason:`[EXEC:${langId}]\n${r.stdout}\n[/EXEC:${langId}]`};
}
const run=()=>{
  try{
    const{tool_name,tool_input}=JSON.parse(fs.readFileSync(0,'utf-8'));
    if(!tool_name)return{allow:true};
    if(['find','Find','Glob','Grep'].includes(tool_name))return{block:true,reason:'Use the code-search skill for codebase exploration instead of Grep/Glob/find. Describe what you need in plain language — it understands intent, not just patterns.'};
    if(['Write','write_file'].includes(tool_name)){
      const fp=tool_input?.file_path||'',ext=path.extname(fp),base=path.basename(fp).toLowerCase();
      if((ext==='.md'||ext==='.txt'||base.startsWith('features_list'))&&!base.startsWith('claude')&&!base.startsWith('readme')&&!fp.includes('/skills/'))return{block:true,reason:'Cannot create documentation files. Only CLAUDE.md and readme.md are maintained.'};
      if(/\.(test|spec)\.(js|ts|jsx|tsx|mjs|cjs)$/.test(base)||/^(jest|vitest|mocha|ava|jasmine|tap)\.(config|setup)/.test(base)||['/\_\_tests\_\_/','/test/','/tests/','/fixtures/','/test-data/','/\_\_mocks\_\_/'].some(d=>fp.includes(d))||/\.(snap|stub|mock|fixture)\.(js|ts|json)$/.test(base))return{block:true,reason:'Test files forbidden on disk. Use Bash tool with real services for all testing.'};
    }
    if(['glob','search_file_content','Search','search'].includes(tool_name))return{allow:true};
    if(tool_name==='Task'&&(tool_input?.subagent_type||'')==='Explore')return{block:true,reason:'Use gm:thorns-overview for codebase insight, then use gm:code-search'};
    if(tool_name==='EnterPlanMode')return{block:true,reason:'Plan mode is disabled. Use GM agent planning (PLAN→EXECUTE→EMIT→VERIFY→COMPLETE state machine) via gm:gm subagent instead.'};
    if(tool_name==='Bash'){
      const command=(tool_input?.command||'').trim();
      const er=handleExec(command,tool_input?.cwd);if(er)return er;
      if(!/^(git |gh |npm |npx |bun |node |python |python3 |ruby |go |deno |tsx |ts-node |docker |sudo systemctl|systemctl |pm2 |cd )/.test(command))return{block:true,reason:'Bash only allows: git, gh, node, python, bun, npx, ruby, go, deno, docker, npm, systemctl, pm2, cd. Write all logic as code and execute it via Bash (e.g. node -e "...", python -c "...", bun -e "..."). Use Read/Write/Edit for file ops. Use code-search skill for exploration.'};
    }
    return{allow:true};
  }catch(e){return{allow:true};}
};
try{
  const result=run();
  if(result.block){console.log(JSON.stringify(isGemini?{decision:'deny',reason:result.reason}:{decision:'block',reason:result.reason}));process.exit(0);}
  if(isGemini)console.log(JSON.stringify({decision:'allow'}));
  process.exit(0);
}catch(e){process.exit(0);}
