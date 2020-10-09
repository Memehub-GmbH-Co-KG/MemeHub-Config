# Configuration for memehub

This service manages the configuration of a MemeHub Bot. It is meant to be run as a docker container.

## Environment

You can configure the service using enviroment variables.

| Variable         | Description                     | Default                                       |
| ---------------- | ------------------------------- | --------------------------------------------- |
| `NODE_ENV`       | The environment you are running | not modified, node sets it to `"development"` |
| `BOT_TOKEN`      | The Telegram bot token to use   | `undefined`                                   |
| `PREFIX`         | The prefix for all config keys  | `"config"`                                    |
| `REDIS_PORT`     | The redis port                  | `6379`                                        |
| `REDIS_HOST`     | The redis host                  | `"127.0.0.1"`                                 |
| `REDIS_FAMILY`   | Use IPv4 or IPv6                | `4`                                           |
| `REDIS_PASSWORD` | The redis password              | `null`                                        |
| `REDIS_DB`       | The redis database              | `0`                                           |

You will have to set the `BOT_TOKEN`, otherwise the service will not start. Setting `NODE_ENV` is also recommended for everything but developing.
