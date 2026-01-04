import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BanksService } from './banks.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';
import { UpdateBalanceDto } from './dto/update-balance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Bancos')
@ApiBearerAuth()
@Controller('banks')
@UseGuards(JwtAuthGuard)
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo banco' })
  @ApiResponse({ status: 201, description: 'Banco criado com sucesso' })
  create(@CurrentUser() user: { id: string }, @Body() createBankDto: CreateBankDto) {
    return this.banksService.create(user.id, createBankDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os bancos do usuário' })
  @ApiResponse({ status: 200, description: 'Lista de bancos retornada com sucesso' })
  findAll(@CurrentUser() user: { id: string }) {
    return this.banksService.findAll(user.id);
  }

  @Get('total-balance')
  @ApiOperation({ summary: 'Obter saldo total de todos os bancos' })
  @ApiResponse({ status: 200, description: 'Saldo total retornado com sucesso' })
  getTotalBalance(@CurrentUser() user: { id: string }) {
    return this.banksService.getTotalBalance(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter banco por ID' })
  @ApiResponse({ status: 200, description: 'Banco retornado com sucesso' })
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.banksService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar banco' })
  @ApiResponse({ status: 200, description: 'Banco atualizado com sucesso' })
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() updateBankDto: UpdateBankDto,
  ) {
    return this.banksService.update(id, user.id, updateBankDto);
  }

  @Patch(':id/balance')
  @ApiOperation({ summary: 'Atualizar saldo do banco manualmente' })
  @ApiResponse({ status: 200, description: 'Saldo atualizado com sucesso' })
  updateBalance(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() updateBalanceDto: UpdateBalanceDto,
  ) {
    return this.banksService.updateBalance(id, user.id, updateBalanceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir banco' })
  @ApiResponse({ status: 200, description: 'Banco excluído com sucesso' })
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.banksService.remove(id, user.id);
  }
}
