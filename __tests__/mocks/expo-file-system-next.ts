class MockDirectory {
  path: string;

  constructor(parent: { path: string } | null, name: string) {
    this.path = parent ? `${parent.path}/${name}` : name;
  }

  get exists(): boolean {
    return false;
  }

  create(): void {}

  delete(): void {}
}

class MockFile {
  path: string;

  constructor(parent: { path: string }, name: string) {
    this.path = `${parent.path}/${name}`;
  }

  get exists(): boolean {
    return false;
  }

  create(): void {}

  delete(): void {}

  text(): string {
    return "";
  }

  write(_value: string): void {}
}

export { MockDirectory as Directory, MockFile as File };
export const Paths = { document: { path: "document" } };

export {};

module.exports = {
  Directory: MockDirectory,
  File: MockFile,
  Paths,
};
