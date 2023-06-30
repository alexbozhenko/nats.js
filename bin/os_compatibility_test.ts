/*
 * Copyright 2023 The NATS Authors
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { connect, millis, Msg } from "../src/mod.ts";

const nc = await connect({ servers: "demo.nats.io" });
const js = nc.jetstream();
const jsm = await js.jetstreamManager();

const sub = nc.subscribe("tests.object_store.>");

const create = async function (m: Msg): Promise<void> {
  const config = m.json<{ bucket: string }>();
  await js.views.os(config.bucket);
  m.respond();
};

const customized = async function (m: Msg): Promise<void> {
  const config = m.json<Record<string, unknown>>();
  const name = config.bucket as string || "";
  delete config.bucket;
  config.millis = millis(config.max_age as number || 0);
  await js.views.os(name, config);
  m.respond();
};

const entry = async function (m: Msg): Promise<void> {
  const t = m.json<{
    bucket: string;
    config: { description: string; link: null; name: string };
    url: string;
  }>();

  const name = t.bucket as string || "";
  const os = await js.views.os(name);
  const d = await fetch(t.url);
  if (d.ok && d.body) {
    await os.put(
      { name: t.config.name, description: t.config.description },
      d.body,
    );
  }
  m.respond();
};

const opts = [
  create,
  customized,
  entry,
];

let i = 0;
for await (const m of sub) {
  const r = m.json<{ bucket: string }>();
  // if (r.bucket) {
  //   try {
  //     await jsm.streams.delete(`OBJ_${r.bucket as string}`);
  //   } catch (err) {
  //     // ignore
  //   }
  // }
  console.log(r);
  await opts[i++](m);
}
