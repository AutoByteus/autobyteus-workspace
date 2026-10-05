#!/usr/bin/env node
import{spawn}from'node:child_process';import{writeFileSync}from'node:fs';import readline from'node:readline';
const child=spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{});setInterval(()=>{},1000)"],{detached:true,stdio:'ignore'});
child.on('error',e=>{throw e});
writeFileSync(process.env.API013_AGY_OWNED_RECEIPT,JSON.stringify({pid:process.pid,groupPid:child.pid})+'\n');
process.stdout.write(JSON.stringify({event:'init',conversation_id:'owned-api013-physical',init:{agent:'owned',model:'controlled',cwd:process.cwd(),tools:[],permission_mode:'always-proceed'}})+'\n');
readline.createInterface({input:process.stdin}).on('line',()=>{});
// Remain present to reap our exact background child after the actual production stop escalation.
process.on('SIGTERM',()=>{});child.on('exit',()=>process.exit(0));
