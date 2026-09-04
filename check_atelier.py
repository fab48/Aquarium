import re,sys,subprocess,os
s=open('atelier.html',encoding='utf-8').read()
i=s.index('(function () {\n')
j=s.rindex('</script>')
code=s[i:j]
open('_atelier_check.js','w',encoding='utf-8').write(code)
r=subprocess.run(['node','--check','_atelier_check.js'],capture_output=True,text=True)
print(r.stdout[-2000:]); print(r.stderr[-2000:])
sys.exit(r.returncode)
