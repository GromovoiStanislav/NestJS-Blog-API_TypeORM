import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { UserEntity } from "src/entities/user.entity";
import { ProfileResponse } from "src/models/user.model";

@Injectable()
export class UserService {

  constructor(
    @InjectRepository(UserEntity) private userRepo: Repository<UserEntity>
  ) {
  }


  async findByUsername(
    username: string,
    currentUser?: UserEntity
  ): Promise<ProfileResponse> {
    const user = await this.userRepo.findOne({
      where: { username },
      relations: ["followers"]
    });
    if (!user) {
      return null;
    }
    return user.toProfile(currentUser);
  }


  async followUser(
    currentUser: UserEntity,
    username: string
  ): Promise<ProfileResponse> {
    const user = await this.userRepo.findOne({
      where: { username },
      relations: ["followers"]
    });
    user.followers.push(currentUser);
    await user.save();
    return user.toProfile(currentUser);
  }


  async unfollowUser(
    currentUser: UserEntity,
    username: string
  ): Promise<ProfileResponse> {
    const user = await this.userRepo.findOne({
      where: { username },
      relations: ["followers"]
    });
    user.followers = user.followers.filter(
      follower => follower.id !== currentUser.id
    );
    await user.save();
    return user.toProfile(currentUser);
  }

}
