import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SavingsAccountsService } from './savings-accounts.service';
import { CreateSavingsAccountDto } from './dto/create-savings-account.dto';
import { UpdateSavingsAccountDto } from './dto/update-savings-account.dto';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Poupanças')
@ApiBearerAuth()
@Controller('savings-accounts')
@UseGuards(JwtAuthGuard)
export class SavingsAccountsController {
  constructor(private readonly savingsAccountsService: SavingsAccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova poupança' })
  @ApiResponse({ status: 201, description: 'Poupança criada com sucesso' })
  create(
    @CurrentUser() user: { id: string },
    @Body() createSavingsAccountDto: CreateSavingsAccountDto,
  ) {
    return this.savingsAccountsService.create(user.id, createSavingsAccountDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as poupanças do usuário' })
  @ApiResponse({ status: 200, description: 'Lista de poupanças retornada com sucesso' })
  findAll(@CurrentUser() user: { id: string }) {
    return this.savingsAccountsService.findAll(user.id);
  }

  @Get('evolution')
  @ApiOperation({ summary: 'Obter evolução geral de todas as poupanças' })
  @ApiResponse({ status: 200, description: 'Evolução retornada com sucesso' })
  getTotalEvolution(
    @CurrentUser() user: { id: string },
    @Query('months') months?: string,
  ) {
    return this.savingsAccountsService.getTotalEvolution(user.id, months ? parseInt(months) : 12);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter poupança por ID' })
  @ApiResponse({ status: 200, description: 'Poupança retornada com sucesso' })
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.savingsAccountsService.findOne(id, user.id);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Obter transações de uma poupança' })
  @ApiResponse({ status: 200, description: 'Transações retornadas com sucesso' })
  getTransactions(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.savingsAccountsService.getTransactions(id, user.id, limit ? parseInt(limit) : 50);
  }

  @Get(':id/evolution')
  @ApiOperation({ summary: 'Obter evolução de uma poupança específica' })
  @ApiResponse({ status: 200, description: 'Evolução retornada com sucesso' })
  getEvolution(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Query('months') months?: string,
  ) {
    return this.savingsAccountsService.getEvolution(id, user.id, months ? parseInt(months) : 12);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar poupança' })
  @ApiResponse({ status: 200, description: 'Poupança atualizada com sucesso' })
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() updateSavingsAccountDto: UpdateSavingsAccountDto,
  ) {
    return this.savingsAccountsService.update(id, user.id, updateSavingsAccountDto);
  }

  @Post(':id/deposit')
  @ApiOperation({ summary: 'Depositar valor na poupança' })
  @ApiResponse({ status: 201, description: 'Depósito realizado com sucesso' })
  deposit(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() depositDto: DepositDto,
  ) {
    return this.savingsAccountsService.deposit(id, user.id, depositDto);
  }

  @Post(':id/withdraw')
  @ApiOperation({ summary: 'Retirar valor da poupança' })
  @ApiResponse({ status: 201, description: 'Retirada realizada com sucesso' })
  withdraw(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() withdrawDto: WithdrawDto,
  ) {
    return this.savingsAccountsService.withdraw(id, user.id, withdrawDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir poupança' })
  @ApiResponse({ status: 200, description: 'Poupança excluída com sucesso' })
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.savingsAccountsService.remove(id, user.id);
  }
}

