const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

console.log('Detecting operating system...');
const platform = os.platform();
console.log(`OS Detected ${platform}`);

const appDir = path.join(__dirname, 'apps');
if (!fs.existsSync(appDir)) {
  console.error("Apps wasn't found in the current directory");
}

const appsDirs = fs.readdirSync(appDir);

appsDirs.forEach((app) => {
  const appPath = path.join(appDir, app);
  const packageJson = path.join(appPath, 'package.json');

  if (fs.existsSync(packageJson)) {
    console.log(`Package.json found in Folder: ${app}`);
    execSync(`npm install --prefix ${appPath}`, {
      stdio: 'inherit',
      shell: true,
    });

    console.log('\n Install Successful \n');
  }
});
