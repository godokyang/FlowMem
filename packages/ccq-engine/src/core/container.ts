// @ccq/engine - 依赖注入容器

class Container {
  private services = new Map<string, any>();

  register<T>(name: string, service: T) {
    this.services.set(name, service);
  }

  resolve<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    return service;
  }

  has(name: string): boolean {
    return this.services.has(name);
  }

  clear() {
    this.services.clear();
  }
}

export const container = new Container();
