#!/usr/bin/env bun

import { config } from '@/config'
import { $ } from 'bun'

interface SlackDumpUser {
    id: string
    name: string
    real_name: string
    profile: {
        email: string
        image_72: string
    }
    is_bot: boolean
}

async function checkSlackdumpInstallation(): Promise<boolean> {
    try {
        await $`which slackdump`.quiet()
        return true
    } catch {
        return false
    }
}

async function installSlackdump(): Promise<boolean> {
    const platform = process.platform

    try {
        if (platform === 'darwin') {
            // Install via Homebrew on macOS
            console.error(`# macOS (using Homebrew):\nbrew install slackdump\n
For more details: https://github.com/rusq/slackdump#installation-and-quickstart`)
            return true
        } else {
            console.error(`
Please install slackdump manually:
1. Download the latest release for your OS from: https://github.com/rusq/slackdump/releases
2. Unpack the archive
3. Move the slackdump executable to your PATH

For more details: https://github.com/rusq/slackdump#installation-and-quickstart
`)
            return false
        }
    } catch (error) {
        console.error('Failed to install slackdump:', error)
        return false
    }
}

async function dumpUsers() {
    const outputPath = './exports/users.json'
    const outputPathById = './exports/users-by-id.json'

    await $`slackdump list users -format JSON > ${outputPath}`
    await $`rm users-*.json` // produces a file anyway so gotta delete
    const users = await Bun.file(outputPath).json()

    const mappedUsers = users
        .filter((user: SlackDumpUser) => user.is_bot === false)
        .map((user: SlackDumpUser) => ({
            id: user.id,
            name:
                user.name.split('.')[0] +
                (user.name.split('.')[1]
                    ? '.' + user.name.split('.')[1].slice(0, 1)
                    : ''),
            realName:
                user.real_name.split(' ')[0] +
                (user.real_name.split(' ')[1]
                    ? ' ' + user.real_name.split(' ')[1].slice(0, 1)
                    : ''),
            email: user.profile.email,
            avatar: user.profile.image_72,
        }))

    const mappedUsersById = mappedUsers.reduce(
        (acc: Record<string, any>, user: any) => {
            acc[user.id] = user
            return acc
        },
        {},
    )

    await Bun.write(outputPath, JSON.stringify(mappedUsers))
    await Bun.write(outputPathById, JSON.stringify(mappedUsersById))

    return mappedUsersById
}

async function dumpChannelMessages(
    channelId: string,
    channelName: string,
    usersById: Record<string, any>,
    channelsById: Record<string, string>,
) {
    const outputSlackdumpPath = `./exports/${channelName}`
    const outputSlackdumpJsonPath = `${outputSlackdumpPath}/${channelId}.json`
    const finalJsonPath = `./exports/channels/${channelName}.json`

    console.log(`Starting Slack dump for channel ${channelName}...`)
    await $`slackdump dump -files=false -o ${outputSlackdumpPath} ${channelId}`

    const slackdumpJson = await Bun.file(outputSlackdumpJsonPath).json()
    await $`rm -rf ${outputSlackdumpPath}`
    await $`rm -rf channels-*.json`.catch(() => {})

    const mappedMessages = slackdumpJson.messages
        .filter((message: any) => !message.subtype)
        .map((message: any) => {
            console.log('Original message:', message?.text)
            const text = !message?.text
                ? ''
                : message.text
                      .replace(/(<!.+>|:.+:)/g, (match: string) => {
                          console.log('Removing special tag/emoji:', match)
                          return ''
                      })
                      .replace(
                          /<#(C[A-Z0-9]+)\|?([^>]*)>/g,
                          (_: any, channelId: string, channelName: string) => {
                              const name =
                                  channelName ||
                                  channelsById[channelId] ||
                                  channelId
                              console.log(
                                  'Replacing channel ID:',
                                  channelId,
                                  'with name:',
                                  name,
                              )
                              return `#${name}`
                          },
                      )
                      .replace(
                          /\n/g,
                          '<hr style="margin: 1px 0; border: none;">',
                      )
                      .trim()

            return {
                text,
                user: message.user,
                userName: usersById[message.user].name,
                ts: message.ts,
            }
        })
        .filter((message: any) => message.text)

    console.log(`Exporting ${mappedMessages.length} messages...`)

    await Bun.write(finalJsonPath, JSON.stringify(mappedMessages))

    console.log(`
Dump completed successfully!
Messages for ${channelName} have been saved to: ${finalJsonPath}
`)

    return mappedMessages
}

async function dumpChannels() {
    const outputPath = './exports/channels.json'
    const outputPathById = './exports/channels-by-id.json'

    const channels = await $`slackdump list channels -format JSON`.json()

    const mappedChannels = channels
        .map((channel: any) => ({
            name: channel.name,
            id: channel.id,
        }))
        .reduce((acc: Record<string, any>, channel: any) => {
            acc[channel.name] = channel.id
            return acc
        }, {})

    const mappedChannelsById = channels.reduce(
        (acc: Record<string, any>, channel: any) => {
            acc[channel.id] = channel.name
            return acc
        },
        {},
    )

    await Bun.write(outputPath, JSON.stringify(mappedChannels))
    await Bun.write(outputPathById, JSON.stringify(mappedChannelsById))

    return { channels: mappedChannels, channelsById: mappedChannelsById }
}

async function confirmProductionSeed() {
    if (config.NODE_ENV !== 'production') return true

    console.log(
        '\n⚠️  WARNING: You are about to seed data in PRODUCTION environment!',
    )
    console.log('Press Enter to continue or Ctrl+C to abort...')

    try {
        await new Promise(resolve => process.stdin.once('data', resolve))
        return true
    } catch (error) {
        return false
    }
}

async function dump() {
    if (config.NODE_ENV !== 'production') {
        console.log('This script can only be run in production environment')
        process.exit(0)
    }

    console.log('Starting data seeding...')
    console.log('Environment:', config.NODE_ENV)

    const shouldProceed = await confirmProductionSeed()
    if (!shouldProceed) {
        console.log('Seeding aborted.')
        process.exit(0)
    }

    const inputChannels = Bun.argv.slice(2)

    if (inputChannels.length === 0) {
        console.error('Please provide at least one channel name')
        process.exit(1)
    }

    const isInstalled = await checkSlackdumpInstallation()

    if (!isInstalled) {
        const installed = await installSlackdump()
        if (!installed) {
            process.exit(1)
        }
    }

    try {
        // Create a directory for the export if it doesn't exist
        await $`mkdir -p exports exports/channels`

        const { channels, channelsById } = await dumpChannels()
        const usersById = await dumpUsers()

        for (const name of inputChannels) {
            const id = channels[name]
            if (!id) {
                console.error(
                    `Channel "${name}" not found in available channels`,
                )
                continue
            }
            await dumpChannelMessages(id, name, usersById, channelsById)
        }
    } catch (error) {
        console.error('Failed to dump Slack messages:', error)
        process.exit(1)
    }
}

// Run the script
await dump()
