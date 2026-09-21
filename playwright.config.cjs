const {defineConfig,devices}=require('@playwright/test');
module.exports=defineConfig({
 testDir:'./tests/e2e',fullyParallel:true,forbidOnly:!!process.env.CI,retries:process.env.CI?1:0,workers:2,
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:'http://127.0.0.1:4173',trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:{command:'npm run preview',url:'http://127.0.0.1:4173',reuseExistingServer:false},
 projects:[
  {name:'desktop',use:{...devices['Desktop Chrome'],channel:process.env.PW_CHANNEL||undefined}},
  {name:'mobile',use:{...devices['Pixel 7'],channel:process.env.PW_CHANNEL||undefined}},
  // PW_WEBKIT=1 roda o motor do Safari tambem fora do CI.
  ...(process.env.CI||process.env.PW_WEBKIT?[{name:'webkit-mobile',use:{...devices['iPhone 13']}},{name:'webkit-desktop',use:{...devices['Desktop Safari']}}]:[])
 ]
});
