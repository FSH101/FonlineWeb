import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { logger } from '../logger';

type ScriptModule = {
  id?: string;
  onLoad?: () => Promise<void> | void;
  onUnload?: () => Promise<void> | void;
};

export class ScriptManager {
  private readonly scriptsDir: string;
  private loadedScripts = new Map<string, ScriptModule>();

  constructor(scriptsDir: string) {
    this.scriptsDir = scriptsDir;
  }

  async loadAll() {
    const files = await fs.promises.readdir(this.scriptsDir);

    for (const file of files) {
      if (!file.endsWith('.ts') && !file.endsWith('.js')) {
        continue;
      }

      const scriptPath = path.join(this.scriptsDir, file);
      await this.loadScript(scriptPath);
    }
  }

  async loadScript(scriptPath: string) {
    const id = path.basename(scriptPath, path.extname(scriptPath));

    await this.unloadScript(id);

    try {
      const moduleUrl = pathToFileURL(scriptPath).toString();
      const imported = (await import(moduleUrl)) as ScriptModule;
      const moduleId = imported.id ?? id;
      const moduleWithId: ScriptModule & { id: string } = { ...imported, id: moduleId };
      this.loadedScripts.set(moduleId, moduleWithId);
      await imported.onLoad?.();
      logger.info(`Скрипт ${moduleId} загружен`);
    } catch (error) {
      logger.error(`Не удалось загрузить скрипт ${id}`, error);
    }
  }

  async unloadScript(id: string) {
    const script = this.loadedScripts.get(id);
    if (!script) {
      return;
    }

    try {
      await script.onUnload?.();
      this.loadedScripts.delete(id);
      logger.info(`Скрипт ${id} выгружен`);
    } catch (error) {
      logger.error(`Ошибка при выгрузке скрипта ${id}`, error);
    }
  }
}
