import { User as IUser, Role } from "@workspace/database";
import { ICreateUserRequest, IUpdateUserRequest } from "@workspace/shared";
import { singleton } from "tsyringe";

import { PrismaService } from "../services/index.js";
import { User } from "../structures/index.js";

// marks the class as a singleton for dependency injection
@singleton()
export class UserManager {
  constructor(private prisma: PrismaService) {}

  // find a user by ID, including the Teacher or Controller relation based on the user's role
  async findOne(id: number): Promise<User | null> {
    try {
      const result = await this.prisma.user.findUniqueOrThrow({
        where: { id },
        include: {
          Teacher: true,  // include Teacher relation if it exists
          Controller: true,  // include Controller relation if it exists
        },
      });

      return new User(result);  // returns the found user as an instance of User
    } catch (_err) {
      return null;  // returns null if the user is not found or an error occurs
    }
  }

  // find a user by username, including the Teacher or Controller relation
  async findByUsername(username: string): Promise<User | null> {
    try {
      const result = await this.prisma.user.findUniqueOrThrow({
        where: { username },
        /* include: {
          Teacher: true,
          Controller: true,
        }, */
      });

      return new User(result);  // returns the found user as an instance of User
    } catch (_err) {
      return null;  // returns null if the user is not found or an error occurs
    }
  }

  // update user details; for Teacher/Controller-specific fields, handle separately in their services if necessary
  async update(user: IUpdateUserRequest): Promise<User> {
    const { id } = user;
    const result = await this.prisma.user.update({
      data: user,  // updates the user record with the provided data
      where: { id },
    });
    return new User(result);  // returns the updated user as an instance of User
  }

  // find all users
  async findAll(): Promise<IUser[]> {
    return await this.prisma.user.findMany();  // returns all user records from the database
  }

  // create a new user, along with their Teacher or Controller relation based on the role
  async create(user: ICreateUserRequest): Promise<User> {
    const { firstName, lastName, ...rest } = user;
    const result = await this.prisma.user.create({
      data: {
        ...rest,
        // create a Teacher or Controller relation based on the role
        ...(Role.CONTROLLER === rest.role
          ? {
              Controller: {
                create: {
                  firstName,
                  lastName,
                },
              },
            }
          : {
              Teacher: {
                create: {
                  firstName,
                  lastName,
                  retirementDate: new Date(),  // TODO: set a proper value
                  totalTeachingDuty: 0,  // TODO: set a proper value
                },
              },
            }),
      },
    });
    return new User(result);  // returns the newly created user as an instance of User
  }
}
