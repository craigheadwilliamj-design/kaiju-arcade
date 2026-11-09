import {mkdir,readFile,writeFile,cp} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
await mkdir('dist',{recursive:true});
await cp('public','dist',{recursive:true});
for(const file of ['config','levels','rules','combat','military','population','campaign','rival','presentation','game']) {
 const source=await readFile(`src/${file}.ts`,'utf8');
 await writeFile(`dist/${file}.js`,stripTypeScriptTypes(source,{mode:'strip'}).replaceAll('.ts\"','.js\"').replaceAll(".ts'",".js'"));
}
console.log('Built static Canvas game in dist/');
