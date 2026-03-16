export class NotFoundException extends Error {
  constructor(resource, id) {
    super(`${resource} not found with id: ${id}`);
    this.name = 'NotFoundException';
    this.statusCode = 404;
  }
}
