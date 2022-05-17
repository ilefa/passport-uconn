# passport-uconn

![version badge](https://img.shields.io/badge/version-1.0.0-blue)

This is a custom Passport.js authentication strategy for use on ILEFA websites.

## Installation

Use npm to install passport-uconn.

```bash
npm install @ilefa/passport-uconn
```

Since ``passport-uconn`` is currently hosted on GitHub packages, you will need to make a ``.npmrc`` file in the root of your project, and insert the following:

```env
@ilefa:registry=https://npm.pkg.github.com
```

## Usage

```ts
import passport from 'passport';

import { Strategy } from '@ilefa/passport-uconn';

passport.use(new Strategy({
    serverBaseURL: 'https://boneyard.its.uconn.edu',
    serviceURL: 'https://boneyard.its.uconn.edu/login',
    passReqToCallback: false
}));

passport.authenticate('cas', ...);

```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[GPL-3.0](https://choosealicense.com/licenses/gpl-3.0/)